import { z } from '@hono/zod-openapi';
import { booleanQueryParam, createModuleQuerySchema, flatQueryString } from '@/core/query';
import { localeParamSchema } from '@/validators/public';

export const listPublicProjectsQuerySchema = createModuleQuerySchema({
  locale: localeParamSchema,
  technology: flatQueryString
    .optional()
    .openapi({ param: { name: 'technology', in: 'query' }, example: 'nextjs' }),
  type: z
    .enum(['personal', 'freelance', 'company', 'open_source', 'hackathon'])
    .optional()
    .openapi({ param: { name: 'type', in: 'query' } }),
  featured: booleanQueryParam,
});

export type ListPublicProjectsQueryDto = z.infer<typeof listPublicProjectsQuerySchema>;
