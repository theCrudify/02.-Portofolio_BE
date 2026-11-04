import { z } from '@hono/zod-openapi';
import { createModuleQuerySchema } from '@/core/query';
import { localeParamSchema } from '@/validators/public';

export const listPublicCertificationsQuerySchema = createModuleQuerySchema({
  locale: localeParamSchema,
  type: z
    .enum(['certification', 'course', 'bootcamp', 'training'])
    .optional()
    .openapi({ param: { name: 'type', in: 'query' } }),
});

export type ListPublicCertificationsQueryDto = z.infer<typeof listPublicCertificationsQuerySchema>;
