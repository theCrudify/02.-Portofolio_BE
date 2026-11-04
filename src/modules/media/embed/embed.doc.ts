import { createRoute, z } from '@hono/zod-openapi';
import { embedMediaBodySchema } from './embed.dto';

export const embedMediaRouteDoc = createRoute({
  method: 'post',
  path: '/v1/admin/media/embed',
  tags: ['Admin Media'],
  summary: 'Register embedded YouTube or Vimeo video',
  request: {
    body: { content: { 'application/json': { schema: embedMediaBodySchema } } },
  },
  responses: {
    201: {
      description: 'Embedded media asset',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
  },
});
