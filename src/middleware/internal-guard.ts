import { createMiddleware } from 'hono/factory';
import { fail } from '@/lib/response';
import type { AppEnv } from '@/types/env';

/**
 * Constant-time string equality check to prevent timing attacks.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Internal Service Guard Middleware (Shared Secret / Pre-Shared Key)
 *
 * Guarantees that requests to protected /v1/* endpoints originate only from
 * an authorized Frontend server (Next.js BFF / SSR) that possesses the matching
 * shared secret in its environment.
 *
 * If INTERNAL_API_SECRET is not configured (or empty) in environment,
 * requests pass through to avoid breaking development/test environments.
 */
export const internalGuardMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const expectedSecret = c.env?.INTERNAL_API_SECRET;

  // Pass through if secret is not configured
  if (!expectedSecret) {
    await next();
    return;
  }

  const incomingSecret =
    c.req.header('x-internal-secret') ?? c.req.header('X-Internal-Secret');

  if (!incomingSecret || !constantTimeEqual(incomingSecret, expectedSecret)) {
    return fail(
      c,
      401,
      'INVALID_INTERNAL_SECRET',
      'Akses ditolak: Kode rahasia internal tidak valid atau tidak disediakan.',
    );
  }

  await next();
});

