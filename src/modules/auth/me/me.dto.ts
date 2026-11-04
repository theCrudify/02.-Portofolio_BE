import { z } from '@hono/zod-openapi';

export const meResponseDto = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['owner', 'editor', 'viewer']),
  totpEnabled: z.boolean(),
  mustEnable2fa: z.boolean(),
});

export type MeResponseDto = z.infer<typeof meResponseDto>;
