import { z } from '@hono/zod-openapi';

export const updateMediaBodySchema = z.object({
  titleEn: z.string().max(160).optional().nullable(),
  titleId: z.string().max(160).optional().nullable(),
  altEn: z.string().max(300).optional().nullable(),
  altId: z.string().max(300).optional().nullable(),
  captionsUrl: z.string().url().optional().nullable(),
});

export type UpdateMediaBodyDto = z.infer<typeof updateMediaBodySchema>;
