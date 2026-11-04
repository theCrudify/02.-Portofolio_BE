import { z } from '@hono/zod-openapi';

export const signMediaBodySchema = z.object({
  kind: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/),
});

export type SignMediaBodyDto = z.infer<typeof signMediaBodySchema>;
