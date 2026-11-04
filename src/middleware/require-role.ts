import { createMiddleware } from 'hono/factory';
import { forbidden, unauthenticated } from '@/lib/errors';
import type { AppEnv, UserRole } from '@/types/env';

const ROLE_RANK: Record<UserRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export function hasMinimumRole(actual: UserRole, minimum: UserRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[minimum];
}

export function requireRole(minRole: UserRole) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      throw unauthenticated('Authentication required');
    }
    if (!hasMinimumRole(user.role, minRole)) {
      throw forbidden(`Role '${minRole}' or higher is required`);
    }
    await next();
  });
}
