import { eq } from 'drizzle-orm';
import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { getDb } from '@/db/client';
import * as schema from '@/db/schema';
import { unauthenticated } from '@/lib/errors';
import { verifySession } from '@/lib/jwt';
import type { AppEnv, AuthUser } from '@/types/env';

export const SESSION_COOKIE_NAME = 'pf_session';
export const PRE_2FA_COOKIE_NAME = 'pf_2fa';

export async function resolveAuthUser(
  token: string | undefined,
  jwtSecret: string,
  db: ReturnType<typeof getDb>,
): Promise<AuthUser | null> {
  if (!token || !jwtSecret) {
    return null;
  }

  try {
    const payload = await verifySession(token, jwtSecret);
    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, payload.sub));
    const userRow = rows.find((u) => u.id === payload.sub);

    if (!userRow || !userRow.isActive || userRow.tokenVersion !== payload.tv) {
      return null;
    }

    return {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      tokenVersion: userRow.tokenVersion,
      totpEnabled: userRow.totpEnabled,
    };
  } catch {
    return null;
  }
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  const jwtSecret = c.env?.JWT_SECRET || 'dev-jwt-secret-min-32-chars-long';
  const db = getDb(c.env);

  const user = await resolveAuthUser(token, jwtSecret, db);
  if (!user) {
    throw unauthenticated('Authentication required');
  }

  c.set('user', user);
  await next();
});
