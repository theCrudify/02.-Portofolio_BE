import { z } from '@hono/zod-openapi';

export const localeParamSchema = z
  .enum(['en', 'id'])
  .optional()
  .default('en')
  .openapi({
    param: { name: 'locale', in: 'query' },
    example: 'en',
  });

export const siteQuerySchema = z.object({
  locale: localeParamSchema,
});

export const projectsQuerySchema = z.object({
  locale: localeParamSchema,
  technology: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .optional()
    .openapi({ param: { name: 'technology', in: 'query' }, example: 'nextjs' }),
  type: z
    .enum(['personal', 'freelance', 'company', 'open_source', 'hackathon'])
    .optional()
    .openapi({ param: { name: 'type', in: 'query' } }),
  page: z.coerce
    .number()
    .int()
    .min(1)
    .optional()
    .default(1)
    .openapi({ param: { name: 'page', in: 'query' }, example: 1 }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .openapi({ param: { name: 'limit', in: 'query' }, example: 20 }),
});

export const projectSlugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .openapi({ param: { name: 'slug', in: 'path' }, example: 'cashier-app' }),
});

export const certificationsQuerySchema = z.object({
  locale: localeParamSchema,
  type: z
    .enum(['certification', 'course', 'bootcamp', 'training'])
    .optional()
    .openapi({ param: { name: 'type', in: 'query' } }),
});
