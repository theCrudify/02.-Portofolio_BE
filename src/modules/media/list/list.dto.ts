import { z } from '@hono/zod-openapi';
import { booleanQueryParam, createModuleQuerySchema, flatQueryString } from '@/core/query';

export const listMediaQuerySchema = createModuleQuerySchema({
  kind: z.enum(['image', 'video', 'document', 'pdf']).optional(),
  provider: flatQueryString.optional(),
  includeDeleted: booleanQueryParam,
});

export type ListMediaQueryDto = z.infer<typeof listMediaQuerySchema>;
