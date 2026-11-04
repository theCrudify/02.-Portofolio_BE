import { createRoute, z } from '@hono/zod-openapi';
import { verify2faBodyDto } from './verify-2fa.dto';

export const verify2faDoc = createRoute({
  method: 'post',
  path: '/2fa/verify',
  tags: ['Auth'],
  summary: 'Verify 2FA TOTP code to complete login',
  request: {
    body: {
      content: {
        'application/json': { schema: verify2faBodyDto },
      },
    },
  },
  responses: {
    200: {
      description: 'Authenticated session',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
    401: { description: 'Invalid 2FA code' },
  },
});

