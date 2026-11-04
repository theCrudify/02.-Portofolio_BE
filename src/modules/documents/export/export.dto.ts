import { z } from '@hono/zod-openapi';
import { flatQueryString } from '@/core/query';

export const exportCvQuerySchema = z.object({
  locale: flatQueryString.optional(),
  type: flatQueryString.optional(),
});

export type ExportCvQueryDto = z.infer<typeof exportCvQuerySchema>;
