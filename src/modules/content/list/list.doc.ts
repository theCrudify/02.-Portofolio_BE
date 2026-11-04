import { createRoute, z } from '@hono/zod-openapi';
import { listContentQueryDto } from './list.dto';

export function createListContentDoc(resource: string) {
  return createRoute({
    method: 'get',
    path: `/v1/admin/${resource}`,
    tags: ['Admin Content'],
    summary: `List ${resource} with pagination, sort, fast filters, search, or full query`,
    request: {
      query: listContentQueryDto,
    },
    responses: {
      200: {
        description: `Paginated list of ${resource}`,
        content: {
          'application/json': {
            schema: z.object({ data: z.array(z.unknown()), meta: z.unknown().optional() }),
          },
        },
      },
    },
  });
}
