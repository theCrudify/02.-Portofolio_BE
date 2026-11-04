import { createRoute, z } from '@hono/zod-openapi';

export const projectRelationsDoc = createRoute({
  method: 'put',
  path: '/v1/admin/projects/:id/technologies',
  tags: ['Admin Content'],
  summary: 'Replace project technologies, links, or media relations',
  responses: {
    200: {
      description: 'Updated relations',
      content: { 'application/json': { schema: z.object({ data: z.object({ updated: z.boolean() }) }) } },
    },
  },
});
