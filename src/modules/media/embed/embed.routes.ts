import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { EmbedMediaController } from './embed.controller';

export const embedMediaRoutes = new OpenAPIHono<AppBindings>();
const controller = new EmbedMediaController();

embedMediaRoutes.post('/v1/admin/media/embed', requireRole('owner', 'editor'), controller.handle);
