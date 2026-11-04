import { z } from '@hono/zod-openapi';

export const detailContentParamDto = z.object({
  id: z.string().uuid(),
});

export type DetailContentParamDto = z.infer<typeof detailContentParamDto>;
