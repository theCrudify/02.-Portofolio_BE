import { createRoute, z } from '@hono/zod-openapi';
import { listUsersQueryDto } from './list.dto';

export const listUsersDoc = createRoute({
  method: 'get',
  path: '/',
  tags: ['Admin Users'],
  summary: 'List users with pagination, sort, fast filters, search, or full query',
  request: {
    query: listUsersQueryDto,
  },
  responses: {
    200: {
      description: 'List of user accounts',
      content: { 'application/json': { schema: z.object({ data: z.array(z.unknown()) }) } },
    },
  },
});
