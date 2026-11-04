import { createRoute } from '@hono/zod-openapi';
import { healthResponseSchema } from './health.dto';

export const healthRouteDoc = createRoute({
  method: 'get',
  path: '/health',
  tags: ['System'],
  summary: 'Check API and database health',
  responses: {
    200: {
      description: 'Health check result',
      content: {
        'application/json': {
          schema: healthResponseSchema,
        },
      },
    },
  },
});
