import { createRoute, z } from '@hono/zod-openapi';

export const exportBackupRouteDoc = createRoute({
  method: 'get',
  path: '/v1/admin/backup/export',
  tags: ['Admin System'],
  summary: 'Export full database backup bundle as JSON',
  responses: {
    200: {
      description: 'Backup JSON bundle',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
  },
});
