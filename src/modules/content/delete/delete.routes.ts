import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import { RESOURCE_REGISTRY, type ResourceName } from '@/services/resource-registry';
import type { AppEnv } from '@/types/env';
import { DeleteContentController } from './delete.controller';

export const deleteContentRoutes = new OpenAPIHono<AppEnv>();
const controller = new DeleteContentController();

for (const resource of Object.keys(RESOURCE_REGISTRY) as ResourceName[]) {
  const config = RESOURCE_REGISTRY[resource];
  deleteContentRoutes.delete(`/v1/admin/${resource}/:id`, requireRole('editor'), (c) =>
    controller.handleSoft(c, config),
  );
  deleteContentRoutes.delete(`/v1/admin/${resource}/:id/permanent`, requireRole('owner'), (c) =>
    controller.handlePermanent(c, config),
  );
}
