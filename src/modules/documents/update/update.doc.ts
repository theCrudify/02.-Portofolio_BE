import { createRoute, z } from '@hono/zod-openapi';

export const activateDocumentRouteDoc = createRoute({
  method: 'post',
  path: '/v1/admin/documents/{id}/activate',
  tags: ['Admin Documents'],
  summary: 'Activate document for its type and locale',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: 'Activated document',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
  },
});
