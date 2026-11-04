import { OpenAPIHono } from '@hono/zod-openapi';
import {
  createDocumentsRoutes,
  deleteDocumentsRoutes,
  listDocumentsRoutes,
  updateDocumentsRoutes,
} from '@/modules/documents';
import type { AppBindings } from '@/types/env';

export const adminDocuments = new OpenAPIHono<AppBindings>({
  defaultHook: (result) => {
    if (!result.success) throw result.error;
  },
});

adminDocuments.route('/', listDocumentsRoutes);
adminDocuments.route('/', createDocumentsRoutes);
adminDocuments.route('/', updateDocumentsRoutes);
adminDocuments.route('/', deleteDocumentsRoutes);

export default adminDocuments;
