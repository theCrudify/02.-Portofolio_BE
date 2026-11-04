import { createRoute, z } from '@hono/zod-openapi';
import { analyticsSummaryQuerySchema } from './summary.dto';

export const analyticsSummaryRouteDoc = createRoute({
  method: 'get',
  path: '/v1/admin/analytics',
  tags: ['Admin Analytics'],
  summary: 'Get aggregated analytics summary',
  request: { query: analyticsSummaryQuerySchema },
  responses: {
    200: {
      description: 'Analytics summary',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
  },
});
