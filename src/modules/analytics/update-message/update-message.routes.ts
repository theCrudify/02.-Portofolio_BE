import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { UpdateMessageController } from './update-message.controller';

export const updateMessageRoutes = new OpenAPIHono<AppBindings>();
const controller = new UpdateMessageController();

updateMessageRoutes.patch('/v1/admin/messages/:id', requireRole('owner', 'editor'), controller.handle);
