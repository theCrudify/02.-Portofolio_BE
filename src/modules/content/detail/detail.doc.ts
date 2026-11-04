import { createRoute, z } from '@hono/zod-openapi';
import { detailContentParamDto } from './detail.dto';

export function createDetailContentDoc(resource: string) {
  return createRoute({
    method: 'get',
    path: `/v1/admin/${resource}/:id`,
    tags: ['Admin Content'],
    summary: `Get ${resource} item by ID`,
    request: { params: detailContentParamDto },
    responses: {
      200: {
        description: `Single ${resource} item`,
        content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
      },
      404: { description: 'Item not found' },
    },
  });
}
