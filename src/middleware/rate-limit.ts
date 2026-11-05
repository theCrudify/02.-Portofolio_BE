import { createMiddleware } from 'hono/factory';
import { fail } from '@/lib/response';
import type { AppEnv } from '@/types/env';
import { and, eq, gte } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import * as schema from '@/db/schema';
import { rateLimited } from '@/lib/errors';

const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_LOGINS = 5;

export async function checkLoginRateLimit(db: DbClient, ipHashVal: string): Promise<void> {
  const windowStart = new Date(Date.now() - LOGIN_WINDOW_MS);
  const rows = await db
    .select()
    .from(schema.loginAttempts)
    .where(
      and(
        eq(schema.loginAttempts.ipHash, ipHashVal),
        eq(schema.loginAttempts.success, false),
        gte(schema.loginAttempts.createdAt, windowStart),
      ),
    );

  const recentFailed = rows.filter(
    (r) =>
      r.ipHash === ipHashVal &&
      r.success === false &&
      new Date(r.createdAt).getTime() >= windowStart.getTime(),
  );

  if (recentFailed.length >= MAX_FAILED_LOGINS) {
    throw rateLimited('Too many failed login attempts. Please try again in 15 minutes.');
  }
}

interface MemoryBucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, MemoryBucket>();

export function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { allowed: boolean; retryAfterSec: number } {
  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfterSec };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function clearMemoryRateLimits(): void {
  memoryBuckets.clear();
}

/**
 * Per-visitor limit on /v1/* via the Workers Rate Limiting binding (shared across
 * isolates, free plan). Only proxied browser requests carry x-client-ip; SSR fetches
 * from our own server don't and are not limited (Next's data cache absorbs page floods).
 */
export const publicRateLimitMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const limiter = c.env?.RATE_LIMITER;
  const visitor = c.env?.INTERNAL_API_SECRET ? c.req.header('x-client-ip') : undefined;
  if (limiter && visitor) {
    const { success } = await limiter.limit({ key: visitor });
    if (!success) {
      c.header('Retry-After', '60');
      return fail(c, 429, 'RATE_LIMITED', 'Too many requests');
    }
  }
  await next();
});
