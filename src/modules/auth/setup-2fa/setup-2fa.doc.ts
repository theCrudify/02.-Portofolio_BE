import { createRoute, z } from '@hono/zod-openapi';
import { setup2faResponseDto } from './setup-2fa.dto';

export const setup2faDoc = createRoute({
  method: 'post',
  path: '/2fa/setup',
  tags: ['Auth'],
  summary: 'Generate 2FA TOTP secret and otpauth URL',
  responses: {
    200: {
      description: 'TOTP setup secret',
      content: { 'application/json': { schema: z.object({ data: setup2faResponseDto }) } },
    },
  },
});

