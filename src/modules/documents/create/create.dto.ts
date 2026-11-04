import { z } from '@hono/zod-openapi';

export const createDocumentBodySchema = z.object({
  mediaId: z.string().uuid(),
  type: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/).default('cv'), // document_type code
  locale: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/), // locale code
  title: z.string().min(1).max(120),
  version: z.number().int().positive().default(1),
  pageCount: z.number().int().positive().optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
});

export const createExportPresetBodySchema = z.object({
  slug: z.string().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(80),
  template: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/).default('full'), // export_template code
  locale: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/).default('en'), // locale code
  featuredOnly: z.boolean().default(false),
  sinceYears: z.number().int().positive().nullable().default(null),
  sections: z
    .array(
      z.object({
        key: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/), // site_section code
        limit: z.number().int().positive().nullable().optional(),
      }),
    )
    .min(1)
    .max(20),
  technologyIds: z.array(z.string().uuid()).default([]),
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
