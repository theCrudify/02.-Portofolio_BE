import { z } from '@hono/zod-openapi';

export const meResponseDto = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/),
  totpEnabled: z.boolean(),
  mustEnable2fa: z.boolean(),
});

export type MeResponseDto = z.infer<typeof meResponseDto>;
