import { createRoute, z } from '@hono/zod-openapi';
import { createMediaBodySchema } from './create.dto';

export const createMediaRouteDoc = createRoute({
  method: 'post',
  path: '/v1/admin/media',
  tags: ['Admin Media'],
  summary: 'Register uploaded Cloudinary media asset',
  request: {
    body: { content: { 'application/json': { schema: createMediaBodySchema } } },
  },
  responses: {
    201: {
      description: 'Created media asset',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
  },
});
