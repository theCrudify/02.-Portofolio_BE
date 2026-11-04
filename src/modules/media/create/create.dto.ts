import { z } from '@hono/zod-openapi';

export const createMediaBodySchema = z.object({
  kind: z.enum(['image', 'video', 'document', 'pdf']),
  publicId: z.string().min(1).max(255),
  url: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), 'URL must use https://'),
  mime: z.string().max(100).optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  bytes: z.number().int().positive().optional().nullable(),
  durationSec: z.number().int().nonnegative().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  captionsUrl: z.string().url().optional().nullable(),
  titleEn: z.string().max(160).optional().nullable(),
  titleId: z.string().max(160).optional().nullable(),
  altEn: z.string().max(300).optional().nullable(),
  altId: z.string().max(300).optional().nullable(),
});

export type CreateMediaBodyDto = z.infer<typeof createMediaBodySchema>;
