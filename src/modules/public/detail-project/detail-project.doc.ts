import { createRoute, z } from '@hono/zod-openapi';
import { detailPublicProjectParamSchema, detailPublicProjectQuerySchema } from './detail-project.dto';

export const detailPublicProjectRouteDoc = createRoute({
  method: 'get',
  path: '/projects/{slug}',
  tags: ['Public'],
  summary: 'Get published project case study detail by slug',
  request: {
    params: detailPublicProjectParamSchema,
    query: detailPublicProjectQuerySchema,
  },
  responses: {
    200: {
      description: 'Project detail with prev/next navigation',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
    304: { description: 'Not modified' },
    404: { description: 'Project not found or not published' },
  },
});
