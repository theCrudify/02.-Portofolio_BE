import { OpenAPIHono } from '@hono/zod-openapi';
import { requireAuth } from '@/middleware/auth';
import type { AppEnv } from '@/types/env';
import { Setup2faController } from './setup-2fa.controller';

export const setup2faRoutes = new OpenAPIHono<AppEnv>();
const controller = new Setup2faController();

setup2faRoutes.post('/2fa/setup', requireAuth, (c) => controller.handle(c));

