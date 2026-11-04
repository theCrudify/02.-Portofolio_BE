import { OpenAPIHono } from '@hono/zod-openapi';
import { requireAuth } from '@/middleware/auth';
import type { AppEnv } from '@/types/env';
import { MeController } from './me.controller';

export const meRoutes = new OpenAPIHono<AppEnv>();
const controller = new MeController();

meRoutes.get('/me', requireAuth, (c) => controller.handle(c));
