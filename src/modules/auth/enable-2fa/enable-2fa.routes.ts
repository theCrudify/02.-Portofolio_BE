import { OpenAPIHono } from '@hono/zod-openapi';
import { requireAuth } from '@/middleware/auth';
import type { AppEnv } from '@/types/env';
import { Enable2faController } from './enable-2fa.controller';

export const enable2faRoutes = new OpenAPIHono<AppEnv>();
const controller = new Enable2faController();

enable2faRoutes.post('/2fa/enable', requireAuth, (c) => controller.handle(c));

