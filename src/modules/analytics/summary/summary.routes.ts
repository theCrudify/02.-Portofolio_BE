import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { AnalyticsSummaryController } from './summary.controller';

export const analyticsSummaryRoutes = new OpenAPIHono<AppBindings>();
const controller = new AnalyticsSummaryController();

analyticsSummaryRoutes.get('/v1/admin/analytics', requireRole('viewer'), controller.handle);
