import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { CreateDocumentsController } from './create.controller';

export const createDocumentsRoutes = new OpenAPIHono<AppBindings>();
const controller = new CreateDocumentsController();

createDocumentsRoutes.post('/v1/admin/documents', requireRole('owner', 'editor'), controller.handleDocument);
createDocumentsRoutes.post('/v1/admin/export-presets', requireRole('owner'), controller.handlePreset);
createDocumentsRoutes.post('/v1/admin/share-links', requireRole('owner', 'editor'), controller.handleShareLink);
