import { createRoute, z } from '@hono/zod-openapi';
import { meResponseDto } from './me.dto';

export const meDoc = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Auth'],
  summary: 'Get current authenticated user profile',
  responses: {
    200: {
      description: 'Current user',
      content: { 'application/json': { schema: z.object({ data: meResponseDto }) } },
    },
  },
});
