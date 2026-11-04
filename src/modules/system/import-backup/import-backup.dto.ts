import { z } from '@hono/zod-openapi';
import { booleanQueryParam } from '@/core/query';
import { BACKUP_TABLES } from '@/services/system.service';

export const importBackupQuerySchema = z.object({
  dryRun: booleanQueryParam,
});

export const importBackupBodySchema = z.object({
  version: z.number().int().default(2),
  exportedAt: z.string().optional(),
  // One array of rows per table, keyed like BACKUP_TABLES in services/system.service.ts.
  tables: z
    .record(z.array(z.record(z.unknown())))
    .refine((t) => Object.keys(t).every((k) => k in BACKUP_TABLES), 'Unknown table in backup'),
});

export type ImportBackupBodyDto = z.infer<typeof importBackupBodySchema>;
