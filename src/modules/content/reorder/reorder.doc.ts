import { createRoute, z } from '@hono/zod-openapi';
import { reorderSchema } from './reorder.dto';

export function createReorderContentDoc(resource: string) {
  return createRoute({
    method: 'put',
    path: `/v1/admin/${resource}/reorder`,
    tags: ['Admin Content'],
    summary: `Batch reorder ${resource} items`,
    request: {
      body: { content: { 'application/json': { schema: reorderSchema } } },
    },
    responses: {
      200: {
        description: 'Reordered count',
        content: { 'application/json': { schema: z.object({ data: z.object({ reordered: z.number() }) }) } },
      },
    },
  });
}
