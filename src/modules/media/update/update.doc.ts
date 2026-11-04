import { createRoute, z } from '@hono/zod-openapi';
import { updateMediaBodySchema } from './update.dto';

export const updateMediaRouteDoc = createRoute({
  method: 'put',
  path: '/v1/admin/media/{id}',
  tags: ['Admin Media'],
  summary: 'Update media metadata',
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: updateMediaBodySchema } } },
  },
  responses: {
    200: {
      description: 'Updated media asset',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
  },
});
