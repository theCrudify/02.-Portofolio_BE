import { createRoute } from '@hono/zod-openapi';

export const logoutDoc = createRoute({
  method: 'post',
  path: '/logout',
  tags: ['Auth'],
  summary: 'Log out of current session',
  responses: { 204: { description: 'Logged out' } },
});

export const logoutAllDoc = createRoute({
  method: 'post',
  path: '/logout-all',
  tags: ['Auth'],
  summary: 'Log out of all active devices',
  responses: { 204: { description: 'All sessions invalidated' } },
});
