import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { ImportBackupController } from './import-backup.controller';

export const importBackupRoutes = new OpenAPIHono<AppBindings>();
const controller = new ImportBackupController();

importBackupRoutes.post('/v1/admin/backup/import', requireRole('owner'), controller.handle);
