import { createRoute } from '@hono/zod-openapi';
import { changePasswordBodyDto } from './change-password.dto';

export const changePasswordDoc = createRoute({
  method: 'post',
  path: '/password',
  tags: ['Auth'],
  summary: 'Change current user password and invalidate active sessions',
  request: {
    body: {
      content: {
        'application/json': { schema: changePasswordBodyDto },
      },
    },
  },
  responses: {
    204: { description: 'Password changed' },
  },
});
