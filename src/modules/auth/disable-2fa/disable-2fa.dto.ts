import { z } from '@hono/zod-openapi';

export const disable2faBodyDto = z.object({
  code: z.string().regex(/^\d{6}$/, '2FA code must be a 6-digit number'),
  password: z.string().min(1).max(256),
});

export type Disable2faBodyDto = z.infer<typeof disable2faBodyDto>;
