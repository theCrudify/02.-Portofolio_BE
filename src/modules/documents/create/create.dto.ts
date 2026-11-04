import { z } from '@hono/zod-openapi';

export const createDocumentBodySchema = z.object({
  mediaId: z.string().uuid(),
  type: z.enum(['cv', 'portfolio_pdf', 'other']).default('cv'),
  locale: z.enum(['en', 'id']),
  title: z.string().min(1).max(120),
  version: z.number().int().positive().default(1),
  pageCount: z.number().int().positive().optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
});

export const createExportPresetBodySchema = z.object({
  slug: z.string().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(80),
  template: z.enum(['full', 'one_page', 'ats']).default('full'),
  locale: z.enum(['en', 'id']).default('en'),
  sections: z
    .array(
      z.object({
        key: z.string().min(1).max(40),
        limit: z.number().int().positive().optional(),
      }),
    )
    .min(1)
    .max(20),
  itemFilter: z
    .object({
      featuredOnly: z.boolean().optional(),
      sinceYears: z.number().int().positive().optional(),
      technologyIds: z.array(z.string().uuid()).optional(),
    })
    .optional(),
  isPublic: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const createShareLinkBodySchema = z
  .object({
    label: z.string().min(1).max(120),
    documentId: z.string().uuid().optional().nullable(),
    presetId: z.string().uuid().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
  })
  .refine((d) => Boolean(d.documentId) !== Boolean(d.presetId), {
    message: 'Exactly one of documentId or presetId must be provided.',
  });

export type CreateDocumentBodyDto = z.infer<typeof createDocumentBodySchema>;
export type CreateExportPresetBodyDto = z.infer<typeof createExportPresetBodySchema>;
export type CreateShareLinkBodyDto = z.infer<typeof createShareLinkBodySchema>;
