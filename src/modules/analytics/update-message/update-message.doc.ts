import { createRoute, z } from '@hono/zod-openapi';
import { updateMessageBodySchema } from './update-message.dto';

export const updateMessageRouteDoc = createRoute({
  method: 'patch',
  path: '/v1/admin/messages/{id}',
  tags: ['Admin Analytics'],
  summary: 'Mark contact message as read or archived',
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: updateMessageBodySchema } } },
  },
  responses: {
    200: {
      description: 'Updated message',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
  },
});
