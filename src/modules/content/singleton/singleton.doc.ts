import { createRoute, z } from '@hono/zod-openapi';

export const dashboardDoc = createRoute({
  method: 'get',
  path: '/v1/admin/dashboard',
  tags: ['Admin Content'],
  summary: 'Get admin dashboard counts, expiring certs, and recent audit logs',
  responses: {
    200: {
      description: 'Dashboard summary',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
  },
});
