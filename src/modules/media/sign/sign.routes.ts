import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { SignMediaController } from './sign.controller';

export const signMediaRoutes = new OpenAPIHono<AppBindings>();
const controller = new SignMediaController();

signMediaRoutes.post('/v1/admin/media/sign', requireRole('owner', 'editor'), controller.handle);
