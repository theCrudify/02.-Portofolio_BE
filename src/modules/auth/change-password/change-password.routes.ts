import { OpenAPIHono } from '@hono/zod-openapi';
import { requireAuth } from '@/middleware/auth';
import type { AppEnv } from '@/types/env';
import { ChangePasswordController } from './change-password.controller';

export const changePasswordRoutes = new OpenAPIHono<AppEnv>();
const controller = new ChangePasswordController();

changePasswordRoutes.post('/password', requireAuth, (c) => controller.handle(c));
