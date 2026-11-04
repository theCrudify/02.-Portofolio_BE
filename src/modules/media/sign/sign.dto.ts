import { z } from '@hono/zod-openapi';

export const signMediaBodySchema = z.object({
  kind: z.enum(['image', 'video', 'document', 'pdf']),
});

export type SignMediaBodyDto = z.infer<typeof signMediaBodySchema>;
