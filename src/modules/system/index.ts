import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppBindings } from '@/types/env';
import { exportBackupRoutes } from './export-backup';
import { healthRoutes } from './health';
import { importBackupRoutes } from './import-backup';
import { listAuditLogsRoutes } from './list-audit-logs';

export const systemModuleRoutes = new OpenAPIHono<AppBindings>({
  defaultHook: (result) => {
    if (!result.success) throw result.error;
  },
});

systemModuleRoutes.route('/', exportBackupRoutes);
systemModuleRoutes.route('/', importBackupRoutes);
systemModuleRoutes.route('/', listAuditLogsRoutes);

export { healthRoutes };
export * from './export-backup';
export * from './import-backup';
export * from './list-audit-logs';
export * from './health';
