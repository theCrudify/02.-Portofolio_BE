import { createRoute, z } from '@hono/zod-openapi';
import { createDocumentBodySchema } from './create.dto';

export const createDocumentRouteDoc = createRoute({
  method: 'post',
  path: '/v1/admin/documents',
  tags: ['Admin Documents'],
  summary: 'Register new document record',
  request: {
    body: { content: { 'application/json': { schema: createDocumentBodySchema } } },
  },
  responses: {
    201: {
      description: 'Created document',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
  },
});
