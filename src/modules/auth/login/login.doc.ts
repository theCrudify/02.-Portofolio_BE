import { createRoute, z } from '@hono/zod-openapi';
import { loginBodyDto } from './login.dto';

export const loginDoc = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Auth'],
  summary: 'Authenticate user with email and password',
  request: {
    body: {
      content: {
        'application/json': { schema: loginBodyDto },
      },
    },
  },
  responses: {
    200: {
      description: 'Authenticated session',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
    401: { description: 'Invalid credentials or TOTP required' },
    429: { description: 'Too many failed login attempts' },
  },
});

