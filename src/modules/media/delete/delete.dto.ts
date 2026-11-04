import { z } from '@hono/zod-openapi';

export const deleteMediaParamSchema = z.object({
  id: z.string().min(1),
});

export type DeleteMediaParamDto = z.infer<typeof deleteMediaParamSchema>;
