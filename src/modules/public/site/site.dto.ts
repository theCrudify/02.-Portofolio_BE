import { z } from '@hono/zod-openapi';
import { localeParamSchema } from '@/validators/public';

export const getSiteQuerySchema = z.object({
  locale: localeParamSchema,
});

export type GetSiteQueryDto = z.infer<typeof getSiteQuerySchema>;
