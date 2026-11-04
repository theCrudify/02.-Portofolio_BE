import { createRoute, z } from '@hono/zod-openapi';
import { listMessagesQuerySchema } from './list-messages.dto';

export const listMessagesRouteDoc = createRoute({
  method: 'get',
  path: '/v1/admin/messages',
  tags: ['Admin Analytics'],
  summary: 'List contact messages with pagination, fast sort, fast filter, search, and full query',
  request: { query: listMessagesQuerySchema },
  responses: {
    200: {
      description: 'Paginated or full messages list',
      content: { 'application/json': { schema: z.object({ data: z.array(z.unknown()), meta: z.record(z.unknown()).optional() }) } },
    },
  },
});
