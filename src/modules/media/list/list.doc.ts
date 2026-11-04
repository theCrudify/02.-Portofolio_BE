import { createRoute, z } from '@hono/zod-openapi';
import { listMediaQuerySchema } from './list.dto';

export const listMediaRouteDoc = createRoute({
  method: 'get',
  path: '/v1/admin/media',
  tags: ['Admin Media'],
  summary: 'List media assets with pagination, fast sort, fast filter, search, and full query',
  request: {
    query: listMediaQuerySchema,
  },
  responses: {
    200: {
      description: 'Paginated or full media list',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(z.unknown()),
            meta: z.record(z.unknown()).optional(),
          }),
        },
      },
    },
  },
});
