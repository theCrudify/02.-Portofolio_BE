import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { UpdateDocumentsController } from './update.controller';

export const updateDocumentsRoutes = new OpenAPIHono<AppBindings>();
const controller = new UpdateDocumentsController();

updateDocumentsRoutes.post('/v1/admin/documents/:id/activate', requireRole('owner'), controller.handleActivateDocument);
updateDocumentsRoutes.put('/v1/admin/export-presets/:id', requireRole('owner'), controller.handleUpdatePreset);
updateDocumentsRoutes.patch('/v1/admin/share-links/:id', requireRole('owner', 'editor'), controller.handleUpdateShareLink);
