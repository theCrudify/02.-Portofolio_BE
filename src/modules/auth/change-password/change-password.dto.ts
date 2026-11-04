import { z } from '@hono/zod-openapi';

export const changePasswordBodyDto = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(10, 'Password must be at least 10 characters').max(256),
});

export type ChangePasswordBodyDto = z.infer<typeof changePasswordBodyDto>;
