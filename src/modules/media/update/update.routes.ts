import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { UpdateMediaController } from './update.controller';

export const updateMediaRoutes = new OpenAPIHono<AppBindings>();
const controller = new UpdateMediaController();

updateMediaRoutes.put('/v1/admin/media/:id', requireRole('owner', 'editor'), controller.handle);
