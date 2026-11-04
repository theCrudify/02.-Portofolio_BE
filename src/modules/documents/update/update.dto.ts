import { z } from '@hono/zod-openapi';
import { createExportPresetBodySchema } from '../create/create.dto';

export const updateExportPresetBodySchema = createExportPresetBodySchema;

export const updateShareLinkBodySchema = z.object({
  label: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export type UpdateExportPresetBodyDto = z.infer<typeof updateExportPresetBodySchema>;
export type UpdateShareLinkBodyDto = z.infer<typeof updateShareLinkBodySchema>;
