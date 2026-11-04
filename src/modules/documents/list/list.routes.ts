import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { ListDocumentsController } from './list.controller';

export const listDocumentsRoutes = new OpenAPIHono<AppBindings>();
const controller = new ListDocumentsController();

listDocumentsRoutes.get('/v1/admin/documents', requireRole('owner', 'editor'), controller.handleDocuments);
listDocumentsRoutes.get('/v1/admin/export-presets', requireRole('owner', 'editor'), controller.handlePresets);
listDocumentsRoutes.get('/v1/admin/share-links', requireRole('owner', 'editor'), controller.handleShareLinks);
