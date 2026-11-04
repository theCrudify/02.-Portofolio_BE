import { createRoute } from '@hono/zod-openapi';
import { deleteDocumentParamSchema } from './delete.dto';

export const deleteDocumentRouteDoc = createRoute({
  method: 'delete',
  path: '/v1/admin/documents/{id}',
  tags: ['Admin Documents'],
  summary: 'Delete document record',
  request: { params: deleteDocumentParamSchema },
  responses: { 204: { description: 'Deleted document' } },
});
