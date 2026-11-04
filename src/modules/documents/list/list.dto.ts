import { z } from '@hono/zod-openapi';
import { booleanQueryParam, createModuleQuerySchema, flatQueryString } from '@/core/query';

export const listDocumentsQuerySchema = createModuleQuerySchema({
  type: z.enum(['cv', 'portfolio_pdf', 'other']).optional(),
  locale: z.enum(['en', 'id']).optional(),
  isActive: booleanQueryParam,
  isPublic: booleanQueryParam,
  template: flatQueryString.optional(),
});

export type ListDocumentsQueryDto = z.infer<typeof listDocumentsQuerySchema>;
