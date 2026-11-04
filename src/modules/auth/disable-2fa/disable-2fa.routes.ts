import { OpenAPIHono } from '@hono/zod-openapi';
import { requireAuth } from '@/middleware/auth';
import type { AppEnv } from '@/types/env';
import { Disable2faController } from './disable-2fa.controller';

export const disable2faRoutes = new OpenAPIHono<AppEnv>();
const controller = new Disable2faController();

disable2faRoutes.post('/2fa/disable', requireAuth, (c) => controller.handle(c));
