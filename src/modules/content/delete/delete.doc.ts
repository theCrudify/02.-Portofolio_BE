import { createRoute } from '@hono/zod-openapi';
import { deleteContentParamDto } from './delete.dto';

export function createDeleteContentDoc(resource: string) {
  return createRoute({
    method: 'delete',
    path: `/v1/admin/${resource}/:id`,
    tags: ['Admin Content'],
    summary: `Soft-delete ${resource} item`,
    request: { params: deleteContentParamDto },
    responses: { 204: { description: 'Soft-deleted' } },
  });
}
