import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppBindings } from '@/types/env';
import { ExportDocumentsController } from './export.controller';

export const exportDocumentsRoutes = new OpenAPIHono<AppBindings>();
const controller = new ExportDocumentsController();

exportDocumentsRoutes.get('/v1/documents/cv', controller.handleCv);
exportDocumentsRoutes.get('/v1/export/resume.json', controller.handleResumeJson);
exportDocumentsRoutes.get('/v1/export/:presetSlug', controller.handlePresetExport);
exportDocumentsRoutes.get('/v1/share/:token', controller.handleShareToken);
