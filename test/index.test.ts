import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '@/index';
import { notFound } from '@/lib/errors';
import { parseLocale, pickLocale } from '@/lib/locale';
import { fail, ok } from '@/lib/response';

describe('T02 · API Foundation', () => {
  const app = createApp();

  app.post('/v1/admin/test-csrf', async (c) => {
    const body = await c.req.json();
    return ok(c, { received: body });
  });

  app.post('/v1/test-zod', async (c) => {
    const body = await c.req.json();
    const schema = z.object({
      titleEn: z.string().min(3, 'Title is required'),
    });
    const parsed = schema.parse(body);
    return ok(c, parsed, { page: 1, limit: 20, total: 1 });
  });

  app.get('/v1/test-app-error', () => {
    throw notFound('Project not found');
  });

  app.get('/v1/test-fail', (c) => {
    return fail(c, 409, 'CONFLICT', 'Slug already exists');
  });

  it('GET /health returns 200 with contract data format and x-request-id', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBeTruthy();

    const json = await res.json<{
      data: { status: string; db: string; time: string };
    }>();
    expect(json.data.status).toBe('ok');
    expect(['ok', 'error']).toContain(json.data.db);
    expect(typeof json.data.time).toBe('string');
  });

  it('GET /openapi.json and GET /docs work properly', async () => {
    const specRes = await app.request('/openapi.json');
    expect(specRes.status).toBe(200);
    const spec = await specRes.json<{ info: { title: string; version: string } }>();
    expect(spec.info.title).toBe('Portfolio API');
    expect(spec.info.version).toBe('1.0.0');

    const docsRes = await app.request('/docs');
    expect(docsRes.status).toBe(200);
    const html = await docsRes.text();
    expect(html).toContain('Portfolio API Reference');
  });

  it('returns 404 NOT_FOUND in contract format for unknown routes', async () => {
    const res = await app.request('/v1/does-not-exist');
    expect(res.status).toBe(404);
    const json = await res.json<{ error: { code: string; message: string } }>();
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('formats ZodError as 400 VALIDATION_ERROR with details', async () => {
    const res = await app.request('/v1/test-zod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titleEn: 'a' }),
    });
    expect(res.status).toBe(400);
    const json = await res.json<{
      error: {
        code: string;
        message: string;
        details: { path: string; message: string }[];
      };
    }>();
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details).toEqual([{ path: 'titleEn', message: 'Title is required' }]);
  });

  it('formats AppError and ok/fail helpers per contract', async () => {
    const okRes = await app.request('/v1/test-zod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titleEn: 'Valid Title' }),
    });
    expect(okRes.status).toBe(200);
    const okJson = await okRes.json<{
      data: { titleEn: string };
      meta: { page: number; limit: number; total: number };
    }>();
    expect(okJson.data.titleEn).toBe('Valid Title');
    expect(okJson.meta).toEqual({ page: 1, limit: 20, total: 1 });

    const errRes = await app.request('/v1/test-app-error');
    expect(errRes.status).toBe(404);
    const errJson = await errRes.json<{ error: { code: string; message: string } }>();
    expect(errJson.error).toEqual({ code: 'NOT_FOUND', message: 'Project not found' });

    const failRes = await app.request('/v1/test-fail');
    expect(failRes.status).toBe(409);
    const failJson = await failRes.json<{ error: { code: string; message: string } }>();
    expect(failJson.error.code).toBe('CONFLICT');
  });

  it('CSRF middleware rejects foreign Origin and non-JSON Content-Type on /v1/admin/*', async () => {
    const foreignRes = await app.request('/v1/admin/test-csrf', {
      method: 'POST',
      headers: {
        Origin: 'https://evil.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hello: 'world' }),
    });
    expect(foreignRes.status).toBe(403);
    const foreignJson = await foreignRes.json<{ error: { code: string } }>();
    expect(foreignJson.error.code).toBe('CSRF_REJECTED');

    const formRes = await app.request('/v1/admin/test-csrf', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'text/plain',
        'Content-Length': '5',
      },
      body: 'hello',
    });
    expect(formRes.status).toBe(403);
    const formJson = await formRes.json<{ error: { code: string } }>();
    expect(formJson.error.code).toBe('CSRF_REJECTED');

    const validRes = await app.request('/v1/admin/test-csrf', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ok: true }),
    });
    expect(validRes.status).toBe(200);
  });

  it('rejects request bodies larger than 1 MB with 413 PAYLOAD_TOO_LARGE', async () => {
    const largeBody = JSON.stringify({ data: 'x'.repeat(1024 * 1024 + 100) });
    const res = await app.request('/v1/test-zod', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(largeBody.length),
      },
      body: largeBody,
    });
    expect(res.status).toBe(413);
    const json = await res.json<{ error: { code: string } }>();
    expect(json.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('parseLocale and pickLocale work with fallback to _en', () => {
    expect(parseLocale('id')).toBe('id');
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale('fr')).toBe('en');
    expect(parseLocale(undefined)).toBe('en');

    const row = {
      titleEn: 'English Title',
      titleId: 'Judul Indonesia',
      summaryEn: 'English Summary',
      summaryId: '',
    };
    expect(pickLocale(row, 'title', 'id')).toBe('Judul Indonesia');
    expect(pickLocale(row, 'title', 'en')).toBe('English Title');
    expect(pickLocale(row, 'summary', 'id')).toBe('English Summary');
  });
});
