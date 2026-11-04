import { createRoute, z } from '@hono/zod-openapi';
import { importBackupBodySchema, importBackupQuerySchema } from './import-backup.dto';

export const importBackupRouteDoc = createRoute({
  method: 'post',
  path: '/v1/admin/backup/import',
  tags: ['Admin System'],
  summary: 'Import JSON backup bundle (supports dryRun)',
  request: {
    query: importBackupQuerySchema,
    body: { content: { 'application/json': { schema: importBackupBodySchema } } },
  },
  responses: {
    200: {
      description: 'Import result',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
  },
});
