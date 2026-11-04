import { createRoute, z } from '@hono/zod-openapi';
import { listPublicProjectsQuerySchema } from './list-projects.dto';

export const listPublicProjectsRouteDoc = createRoute({
  method: 'get',
  path: '/projects',
  tags: ['Public'],
  summary: 'List published projects with pagination, fast sort, fast filter, search, and full query',
  request: { query: listPublicProjectsQuerySchema },
  responses: {
    200: {
      description: 'Paginated published project cards',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(z.unknown()),
            meta: z.record(z.unknown()),
          }),
        },
      },
    },
    304: { description: 'Not modified' },
  },
});
