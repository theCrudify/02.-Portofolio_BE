import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { ListMessagesController } from './list-messages.controller';

export const listMessagesRoutes = new OpenAPIHono<AppBindings>();
const controller = new ListMessagesController();

listMessagesRoutes.get('/v1/admin/messages', requireRole('viewer'), controller.handle);
