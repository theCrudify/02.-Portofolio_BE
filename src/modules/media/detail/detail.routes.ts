import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { DetailMediaController } from './detail.controller';
import { detailMediaRouteDoc } from './detail.doc';

export const detailMediaRoutes = new OpenAPIHono<AppBindings>();
const controller = new DetailMediaController();

detailMediaRoutes.use(detailMediaRouteDoc.getRoutingPath(), requireRole('viewer'));
detailMediaRoutes.openapi(detailMediaRouteDoc, controller.handle);
