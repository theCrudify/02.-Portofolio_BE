import type { Context } from 'hono';
import { describe, expect, it } from 'vitest';
import { createApp } from '@/index';
import { clientIp } from '@/lib/client-ip';
import type { AppEnv, Bindings } from '@/types/env';

const SECRET = 'rate-limit-test-secret';
const baseEnv = {
  DATABASE_URL: 'postgres://localhost:5432/test',
  JWT_SECRET: 'test-jwt-secret-at-least-32-chars-long',
  HASH_SALT: 'test-salt',
  FRONTEND_URL: 'http://localhost:3000',
  REVALIDATE_SECRET: 'r',
  TURNSTILE_SECRET: 't',
  CLOUDINARY_CLOUD_NAME: 'c',
  CLOUDINARY_API_KEY: 'k',
  CLOUDINARY_API_SECRET: 's',
  RESEND_API_KEY: 're',
  CONTACT_TO_EMAIL: 'a@b.c',
} satisfies Bindings;

function fakeCtx(env: Partial<Bindings>, headers: Record<string, string>) {
  return { env, req: { header: (n: string) => headers[n] } } as unknown as Context<AppEnv>;
}

describe('clientIp', () => {
  it('trusts x-client-ip only when the internal secret is configured', () => {
    const h = { 'x-client-ip': '1.1.1.1', 'cf-connecting-ip': '76.76.21.21' };
    expect(clientIp(fakeCtx({ INTERNAL_API_SECRET: SECRET }, h))).toBe('1.1.1.1');
    expect(clientIp(fakeCtx({}, h))).toBe('76.76.21.21');
    expect(clientIp(fakeCtx({}, {}))).toBe('127.0.0.1');
  });
});

describe('publicRateLimitMiddleware', () => {
  const keys: string[] = [];
  const env: Bindings = {
    ...baseEnv,
    INTERNAL_API_SECRET: SECRET,
    RATE_LIMITER: {
      limit: async ({ key }) => {
        keys.push(key);
        return { success: key !== 'blocked' };
      },
    },
  };

  it('returns 429 for a visitor over the limit, before touching the database', async () => {
    const res = await createApp().request(
      '/v1/site',
      { headers: { 'x-internal-secret': SECRET, 'x-client-ip': 'blocked' } },
      env,
    );
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('60');
  });

  it('does not limit server-side fetches that carry no visitor IP', async () => {
    keys.length = 0;
    const res = await createApp().request(
      '/v1/site',
      { headers: { 'x-internal-secret': SECRET } },
      env,
    );
    expect(res.status).not.toBe(429);
    expect(keys).toEqual([]);
  });
});

describe('API docs', () => {
  it('are hidden when the internal secret is configured', async () => {
    const env = { ...baseEnv, INTERNAL_API_SECRET: SECRET };
    expect((await createApp().request('/docs', {}, env)).status).toBe(404);
    expect((await createApp().request('/openapi.json', {}, env)).status).toBe(404);
  });
});
