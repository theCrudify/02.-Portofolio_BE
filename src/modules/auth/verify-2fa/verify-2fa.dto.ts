import { z } from '@hono/zod-openapi';

export const verify2faBodyDto = z.object({
  code: z.string().regex(/^\d{6}$/, '2FA code must be a 6-digit number'),
});

export type Verify2faBodyDto = z.infer<typeof verify2faBodyDto>;

