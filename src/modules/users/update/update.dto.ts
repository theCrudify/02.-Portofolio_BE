import { z } from '@hono/zod-openapi';

export const updateUserParamDto = z.object({
  id: z.string().uuid(),
});

export const updateUserBodyDto = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  role: z.enum(['owner', 'editor', 'viewer']).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserParamDto = z.infer<typeof updateUserParamDto>;
export type UpdateUserBodyDto = z.infer<typeof updateUserBodyDto>;
