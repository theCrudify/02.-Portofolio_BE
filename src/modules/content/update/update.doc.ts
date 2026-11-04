import { createRoute, z } from '@hono/zod-openapi';

export function createUpdateContentDoc(resource: string) {
  return createRoute({
    method: 'put',
    path: `/v1/admin/${resource}/:id`,
    tags: ['Admin Content'],
    summary: `Update ${resource} item by ID`,
    responses: {
      200: {
        description: `Updated ${resource} item`,
        content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
      },
    },
  });
}
