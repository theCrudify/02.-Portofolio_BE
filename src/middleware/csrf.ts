import { createMiddleware } from 'hono/factory';
import { fail } from '@/lib/response';
import type { AppEnv } from '@/types/env';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const csrfMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const method = c.req.method.toUpperCase();
  const path = c.req.path;

  const isProtectedPath = path.startsWith('/v1/admin') || path.startsWith('/v1/auth');
  if (!MUTATING_METHODS.has(method) || !isProtectedPath) {
    await next();
    return;
  }

  const origin = c.req.header('origin');
  const expectedOrigin = c.env?.FRONTEND_URL;

  if (origin && expectedOrigin && origin !== expectedOrigin) {
    return fail(c, 403, 'CSRF_REJECTED', 'Origin header does not match expected frontend origin');
  }

  if (origin && !expectedOrigin && origin !== 'http://localhost:3000') {
    return fail(c, 403, 'CSRF_REJECTED', 'Origin header rejected');
  }

  const contentLength = c.req.header('content-length');
  const hasBody =
    (contentLength !== undefined && Number(contentLength) > 0) ||
    c.req.header('transfer-encoding') !== undefined;

  const contentType = c.req.header('content-type') ?? '';
  if (hasBody && !contentType.toLowerCase().includes('application/json')) {
    return fail(c, 403, 'CSRF_REJECTED', 'Content-Type must be application/json');
  }

  await next();
});

