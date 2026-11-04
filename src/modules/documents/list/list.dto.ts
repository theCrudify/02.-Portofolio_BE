import { z } from '@hono/zod-openapi';
import { booleanQueryParam, createModuleQuerySchema, flatQueryString } from '@/core/query';

export const listDocumentsQuerySchema = createModuleQuerySchema({
  type: flatQueryString.optional(), // document_type code
  locale: flatQueryString.optional(), // locale code
  isActive: booleanQueryParam,
  isPublic: booleanQueryParam,
  template: flatQueryString.optional(),
});

export type ListDocumentsQueryDto = z.infer<typeof listDocumentsQuerySchema>;
