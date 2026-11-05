import { describe, expect, it } from 'vitest';
import { createApp } from '@/index';
import type { Bindings } from '@/types/env';

const TEST_SECRET = 'super-secret-pre-shared-key-test-12345';

const mockEnvWithSecret: Bindings = {
  DATABASE_URL: 'postgres://localhost:5432/test',
  JWT_SECRET: 'test-jwt-secret-at-least-32-chars-long',
  HASH_SALT: 'test-salt',
  FRONTEND_URL: 'http://localhost:3000',
  REVALIDATE_SECRET: 'test-revalidate-secret',
  TURNSTILE_SECRET: 'test-turnstile-secret',
  CLOUDINARY_CLOUD_NAME: 'test-cloud',
  CLOUDINARY_API_KEY: 'test-key',
  CLOUDINARY_API_SECRET: 'test-secret',
  RESEND_API_KEY: 're_test',
  CONTACT_TO_EMAIL: 'contact@example.com',
  INTERNAL_API_SECRET: TEST_SECRET,
};

describe('Internal Service Guard Middleware (PSK / Shared Secret)', () => {
  it('blocks request to /v1/site when INTERNAL_API_SECRET is configured and header is missing', async () => {
    const app = createApp();
    const res = await app.request('/v1/site', { method: 'GET' }, mockEnvWithSecret);

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('INVALID_INTERNAL_SECRET');
  });

  it('blocks request to /v1/site when header has invalid secret', async () => {
    const app = createApp();
    const res = await app.request(
      '/v1/site',
      {
        method: 'GET',
        headers: {
          'x-internal-secret': 'wrong-secret-value',
        },
      },
      mockEnvWithSecret,
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('INVALID_INTERNAL_SECRET');
  });

  it('allows request to public /health without needing secret', async () => {
    const app = createApp();
    const res = await app.request('/health', { method: 'GET' }, mockEnvWithSecret);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { status: string } };
    expect(body.data.status).toBe('ok');
  });

  it('passes request through when valid secret is provided in header', async () => {
    const app = createApp();
    const res = await app.request(
      '/v1/site',
      {
        method: 'GET',
        headers: {
          'x-internal-secret': TEST_SECRET,
        },
      },
      mockEnvWithSecret,
    );

    // The guard accepts it (status is not 401 INVALID_INTERNAL_SECRET)
    expect(res.status).not.toBe(401);
  });

  it('passes request through when INTERNAL_API_SECRET is not configured in env', async () => {
    const app = createApp();
    const envWithoutSecret = { ...mockEnvWithSecret, INTERNAL_API_SECRET: undefined };
    const res = await app.request('/health', { method: 'GET' }, envWithoutSecret);
    expect(res.status).toBe(200);
  });
});
