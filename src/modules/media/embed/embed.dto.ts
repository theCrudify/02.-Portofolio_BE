import { z } from '@hono/zod-openapi';

export const embedMediaBodySchema = z.object({
  url: z.string().url(),
  titleEn: z.string().max(160).optional().nullable(),
  titleId: z.string().max(160).optional().nullable(),
  altEn: z.string().max(300).optional().nullable(),
  altId: z.string().max(300).optional().nullable(),
});

export type EmbedMediaBodyDto = z.infer<typeof embedMediaBodySchema>;
