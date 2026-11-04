import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { ListAuditLogsController } from './list-audit-logs.controller';

export const listAuditLogsRoutes = new OpenAPIHono<AppBindings>();
const controller = new ListAuditLogsController();

listAuditLogsRoutes.get('/v1/admin/audit-logs', requireRole('owner'), controller.handle);
