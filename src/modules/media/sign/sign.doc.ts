import { createRoute, z } from '@hono/zod-openapi';
import { signMediaBodySchema } from './sign.dto';

export const signMediaRouteDoc = createRoute({
  method: 'post',
  path: '/v1/admin/media/sign',
  tags: ['Admin Media'],
  summary: 'Generate signed Cloudinary upload payload',
  request: {
    body: { content: { 'application/json': { schema: signMediaBodySchema } } },
  },
  responses: {
    200: {
      description: 'Signed upload credentials',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
  },
});
