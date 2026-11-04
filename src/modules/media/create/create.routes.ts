import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { CreateMediaController } from './create.controller';

export const createMediaRoutes = new OpenAPIHono<AppBindings>();
const controller = new CreateMediaController();

createMediaRoutes.post('/v1/admin/media', requireRole('owner', 'editor'), controller.handle);
