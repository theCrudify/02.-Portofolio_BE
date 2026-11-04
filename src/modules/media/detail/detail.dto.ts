import { z } from '@hono/zod-openapi';

export const detailMediaParamSchema = z.object({
  id: z.string().min(1),
});

export type DetailMediaParamDto = z.infer<typeof detailMediaParamSchema>;
