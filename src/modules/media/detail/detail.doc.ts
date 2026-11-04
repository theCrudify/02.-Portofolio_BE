import { createRoute, z } from '@hono/zod-openapi';
import { detailMediaParamSchema } from './detail.dto';

export const detailMediaRouteDoc = createRoute({
  method: 'get',
  path: '/v1/admin/media/{id}',
  tags: ['Admin Media'],
  summary: 'Get media asset by ID',
  request: {
    params: detailMediaParamSchema,
  },
  responses: {
    200: {
      description: 'Media asset detail',
      content: {
        'application/json': {
          schema: z.object({ data: z.unknown() }),
        },
      },
    },
  },
});
