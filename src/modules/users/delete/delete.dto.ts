import { z } from '@hono/zod-openapi';

export const deleteUserParamDto = z.object({
  id: z.string().uuid(),
});

export type DeleteUserParamDto = z.infer<typeof deleteUserParamDto>;
