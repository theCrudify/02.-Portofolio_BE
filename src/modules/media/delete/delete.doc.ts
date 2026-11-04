import { createRoute } from '@hono/zod-openapi';
import { deleteMediaParamSchema } from './delete.dto';

export const deleteMediaRouteDoc = createRoute({
  method: 'delete',
  path: '/v1/admin/media/{id}',
  tags: ['Admin Media'],
  summary: 'Soft-delete media asset if unused',
  request: {
    params: deleteMediaParamSchema,
  },
  responses: {
    204: { description: 'Media asset deleted' },
  },
});
