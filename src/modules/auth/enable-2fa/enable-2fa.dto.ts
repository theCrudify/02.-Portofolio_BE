import { z } from '@hono/zod-openapi';

export const enable2faBodyDto = z.object({
  code: z.string().regex(/^\d{6}$/, '2FA code must be a 6-digit number'),
});

export type Enable2faBodyDto = z.infer<typeof enable2faBodyDto>;

