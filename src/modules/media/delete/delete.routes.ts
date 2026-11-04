import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { DeleteMediaController } from './delete.controller';

export const deleteMediaRoutes = new OpenAPIHono<AppBindings>();
const controller = new DeleteMediaController();

deleteMediaRoutes.delete('/v1/admin/media/:id', requireRole('owner'), controller.handle);
