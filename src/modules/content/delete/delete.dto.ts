import { z } from '@hono/zod-openapi';

export const deleteContentParamDto = z.object({
  id: z.string().uuid(),
});

export type DeleteContentParamDto = z.infer<typeof deleteContentParamDto>;
