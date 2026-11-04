import { OpenAPIHono } from '@hono/zod-openapi';
import { requireAuth } from '@/middleware/auth';
import type { AppEnv } from '@/types/env';
import { LogoutController } from './logout.controller';

export const logoutRoutes = new OpenAPIHono<AppEnv>();
const controller = new LogoutController();

logoutRoutes.post('/logout', requireAuth, (c) => controller.handleSingle(c));
logoutRoutes.post('/logout-all', requireAuth, (c) => controller.handleAll(c));
