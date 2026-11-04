import { z } from '@hono/zod-openapi';
import { localeParamSchema, projectSlugParamSchema } from '@/validators/public';

export const detailPublicProjectParamSchema = projectSlugParamSchema;
export const detailPublicProjectQuerySchema = z.object({
  locale: localeParamSchema,
});
