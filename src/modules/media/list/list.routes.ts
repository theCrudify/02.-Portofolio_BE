import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { ListMediaController } from './list.controller';
import { listMediaRouteDoc } from './list.doc';

export const listMediaRoutes = new OpenAPIHono<AppBindings>();
const controller = new ListMediaController();

listMediaRoutes.use(listMediaRouteDoc.getRoutingPath(), requireRole('viewer'));
listMediaRoutes.openapi(listMediaRouteDoc, controller.handle);
