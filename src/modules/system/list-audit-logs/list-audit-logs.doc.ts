import { createRoute, z } from '@hono/zod-openapi';
import { listAuditLogsQuerySchema } from './list-audit-logs.dto';

export const listAuditLogsRouteDoc = createRoute({
  method: 'get',
  path: '/v1/admin/audit-logs',
  tags: ['Admin System'],
  summary: 'List audit logs with pagination, fast sort, fast filter, search, and full query',
  request: { query: listAuditLogsQuerySchema },
  responses: {
    200: {
      description: 'Paginated or full audit logs',
      content: { 'application/json': { schema: z.object({ data: z.array(z.unknown()), meta: z.record(z.unknown()).optional() }) } },
    },
  },
});
