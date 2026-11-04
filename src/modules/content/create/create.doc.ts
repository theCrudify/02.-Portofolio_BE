import { createRoute, z } from '@hono/zod-openapi';

export function createCreateContentDoc(resource: string) {
  return createRoute({
    method: 'post',
    path: `/v1/admin/${resource}`,
    tags: ['Admin Content'],
    summary: `Create a new ${resource} item in draft status`,
    responses: {
      201: {
        description: `Created ${resource} item`,
        content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
      },
    },
  });
}
