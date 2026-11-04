import { createRoute, z } from '@hono/zod-openapi';
import { getSiteQuerySchema } from './site.dto';

export const getSiteRouteDoc = createRoute({
  method: 'get',
  path: '/site',
  tags: ['Public'],
  summary: 'Get aggregated site data for homepage and layout',
  request: { query: getSiteQuerySchema },
  responses: {
    200: {
      description: 'Aggregated site data',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
    304: { description: 'Not modified' },
  },
});
