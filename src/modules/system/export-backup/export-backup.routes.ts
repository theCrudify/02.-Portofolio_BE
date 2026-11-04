import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { ExportBackupController } from './export-backup.controller';

export const exportBackupRoutes = new OpenAPIHono<AppBindings>();
const controller = new ExportBackupController();

exportBackupRoutes.get('/v1/admin/backup/export', requireRole('owner'), controller.handle);
