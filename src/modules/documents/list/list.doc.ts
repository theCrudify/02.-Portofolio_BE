import { createRoute, z } from '@hono/zod-openapi';
import { listDocumentsQuerySchema } from './list.dto';

export const listDocumentsRouteDoc = createRoute({
  method: 'get',
  path: '/v1/admin/documents',
  tags: ['Admin Documents'],
  summary: 'List documents with pagination, sort, filter, search, and full query',
  request: { query: listDocumentsQuerySchema },
  responses: {
    200: {
      description: 'List of documents',
      content: { 'application/json': { schema: z.object({ data: z.array(z.unknown()), meta: z.record(z.unknown()).optional() }) } },
    },
  },
});
