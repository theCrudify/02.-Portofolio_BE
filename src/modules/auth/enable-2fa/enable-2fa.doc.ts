import { createRoute, z } from '@hono/zod-openapi';
import { enable2faBodyDto } from './enable-2fa.dto';

export const enable2faDoc = createRoute({
  method: 'post',
  path: '/2fa/enable',
  tags: ['Auth'],
  summary: 'Confirm TOTP code and enable 2FA',
  request: {
    body: {
      content: {
        'application/json': { schema: enable2faBodyDto },
      },
    },
  },
  responses: {
    200: {
      description: '2FA enabled',
      content: { 'application/json': { schema: z.object({ data: z.object({ ok: z.boolean() }) }) } },
    },
  },
});

