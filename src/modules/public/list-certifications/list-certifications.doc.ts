import { createRoute, z } from '@hono/zod-openapi';
import { listPublicCertificationsQuerySchema } from './list-certifications.dto';

export const listPublicCertificationsRouteDoc = createRoute({
  method: 'get',
  path: '/certifications',
  tags: ['Public'],
  summary: 'List published certifications and courses',
  request: { query: listPublicCertificationsQuerySchema },
  responses: {
    200: {
      description: 'Published certifications',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(z.unknown()),
            meta: z.record(z.unknown()).optional(),
          }),
        },
      },
    },
    304: { description: 'Not modified' },
  },
});
