import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppBindings } from '@/types/env';
import { DeleteDocumentsController } from './delete.controller';

export const deleteDocumentsRoutes = new OpenAPIHono<AppBindings>();
const controller = new DeleteDocumentsController();

deleteDocumentsRoutes.delete('/v1/admin/documents/:id', requireRole('owner'), controller.handleDeleteDocument);
deleteDocumentsRoutes.delete('/v1/admin/export-presets/:id', requireRole('owner'), controller.handleDeletePreset);
deleteDocumentsRoutes.delete('/v1/admin/share-links/:id', requireRole('owner'), controller.handleDeleteShareLink);
