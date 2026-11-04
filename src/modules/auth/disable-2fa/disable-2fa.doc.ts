import { createRoute, z } from '@hono/zod-openapi';
import { disable2faBodyDto } from './disable-2fa.dto';

export const disable2faDoc = createRoute({
  method: 'post',
  path: '/2fa/disable',
  tags: ['Auth'],
  summary: 'Disable 2FA TOTP for non-owner accounts',
  request: {
    body: {
      content: {
        'application/json': { schema: disable2faBodyDto },
      },
    },
  },
  responses: {
    200: {
      description: '2FA disabled',
      content: { 'application/json': { schema: z.object({ data: z.object({ ok: z.boolean() }) }) } },
    },
  },
});
