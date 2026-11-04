import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { getDb } from '@/db/client';
import { forbidden, unauthenticated } from '@/lib/errors';
import { resolveAuthUser, SESSION_COOKIE_NAME } from '@/middleware/auth';
import type { AppEnv, UserRole } from '@/types/env';


const ROLE_RANK: Record<UserRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export function hasMinimumRole(actual: UserRole, minimum: UserRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[minimum];
}

export function requireRole(...roles: UserRole[]) {
  // If multiple roles passed (e.g. requireRole('owner', 'editor')), pick the lowest required rank
  const minRole =
    roles.length > 0
      ? roles.reduce((lowest, r) => (ROLE_RANK[r] < ROLE_RANK[lowest] ? r : lowest), roles[0]!)
      : 'owner';
  return createMiddleware<AppEnv>(async (c, next) => {
    let user = c.get('user');
    if (!user) {
      const token = getCookie(c, SESSION_COOKIE_NAME);
      if (!token) {
        throw unauthenticated('Authentication required');
      }
      const jwtSecret = c.env?.JWT_SECRET || 'dev-jwt-secret-min-32-chars-long';
      const db = getDb(c.env);
      user = (await resolveAuthUser(token, jwtSecret, db)) ?? undefined;
      if (user) {
        c.set('user', user);
      }
    }
    if (!user) {
      throw unauthenticated('Authentication required');
    }
    if (!hasMinimumRole(user.role, minRole)) {
      throw forbidden(`Role '${minRole}' or higher is required`);
    }
    await next();
  });

}

