import { describe, expect, it } from 'vitest';
import { app } from '@/index';

describe('portfolio-api scaffold', () => {
  it('returns status ok on GET /', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { name: string; status: string } }>();
    expect(body.data).toEqual({ name: 'portfolio-api', status: 'ok' });
  });
});

