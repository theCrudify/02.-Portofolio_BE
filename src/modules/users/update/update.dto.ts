import { z } from '@hono/zod-openapi';

export const updateUserParamDto = z.object({
  id: z.string().uuid(),
});

export const updateUserBodyDto = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  role: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserParamDto = z.infer<typeof updateUserParamDto>;
export type UpdateUserBodyDto = z.infer<typeof updateUserBodyDto>;
