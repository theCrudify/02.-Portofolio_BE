import { createRoute, z } from '@hono/zod-openapi';
import { exportCvQuerySchema } from './export.dto';

export const exportCvRouteDoc = createRoute({
  method: 'get',
  path: '/v1/documents/cv',
  tags: ['Public Documents & Export'],
  summary: 'Get active CV or portfolio PDF document metadata and download URL',
  request: { query: exportCvQuerySchema },
  responses: {
    200: {
      description: 'Active document metadata',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
  },
});
