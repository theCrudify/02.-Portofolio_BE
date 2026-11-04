import { z } from '@hono/zod-openapi';

export const createUserBodyDto = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(1).max(100),
  role: z.enum(['owner', 'editor', 'viewer']).default('viewer'),
  password: z.string().min(10).max(256).optional(),
});

export type CreateUserBodyDto = z.infer<typeof createUserBodyDto>;
