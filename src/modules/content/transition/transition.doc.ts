import { createRoute, z } from '@hono/zod-openapi';

export function createTransitionContentDoc(resource: string) {
  return createRoute({
    method: 'post',
    path: `/v1/admin/${resource}/:id/:action`,
    tags: ['Admin Content'],
    summary: `Transition ${resource} status (publish, unpublish, archive, restore)`,
    responses: {
      200: {
        description: 'Transitioned item',
        content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
      },
    },
  });
}
