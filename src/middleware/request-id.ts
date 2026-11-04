import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '@/types/env';

export const requestIdMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const incomingId = c.req.header('x-request-id');
  const id = incomingId && incomingId.length <= 64 ? incomingId : crypto.randomUUID();
  c.set('requestId', id);
  c.header('x-request-id', id);
  await next();
});
