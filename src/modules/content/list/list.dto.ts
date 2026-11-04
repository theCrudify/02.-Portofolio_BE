import { z } from '@hono/zod-openapi';
import { booleanQueryParam, createModuleQuerySchema, flatQueryString } from '@/core/query';

export const listContentQueryDto = createModuleQuerySchema({
  status: z.enum(['draft', 'published', 'archived']).optional(),
  includeDeleted: booleanQueryParam.optional(),
  featured: booleanQueryParam.optional(),
  category: flatQueryString(60).optional(),
  type: flatQueryString(60).optional(),
});

export type ListContentQueryDto = z.infer<typeof listContentQueryDto>;
