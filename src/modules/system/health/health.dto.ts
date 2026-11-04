import { z } from '@hono/zod-openapi';

export const healthResponseSchema = z.object({
  data: z.object({
    status: z.literal('ok'),
    db: z.enum(['ok', 'error']),
    time: z.string(),
  }),
});
