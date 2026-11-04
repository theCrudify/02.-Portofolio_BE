import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppBindings } from '@/types/env';
import { createDocumentsRoutes } from './create';
import { deleteDocumentsRoutes } from './delete';
import { exportDocumentsRoutes } from './export';
import { listDocumentsRoutes } from './list';
import { updateDocumentsRoutes } from './update';

export const documentsModuleRoutes = new OpenAPIHono<AppBindings>({
  defaultHook: (result) => {
    if (!result.success) throw result.error;
  },
});

documentsModuleRoutes.route('/', listDocumentsRoutes);
documentsModuleRoutes.route('/', createDocumentsRoutes);
documentsModuleRoutes.route('/', updateDocumentsRoutes);
documentsModuleRoutes.route('/', deleteDocumentsRoutes);
documentsModuleRoutes.route('/', exportDocumentsRoutes);

export * from './list';
export * from './create';
export * from './update';
export * from './delete';
export * from './export';
