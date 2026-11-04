import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import { RESOURCE_REGISTRY, type ResourceName } from '@/services/resource-registry';
import type { AppEnv } from '@/types/env';
import { UpdateContentController } from './update.controller';

export const updateContentRoutes = new OpenAPIHono<AppEnv>();
const controller = new UpdateContentController();

for (const resource of Object.keys(RESOURCE_REGISTRY) as ResourceName[]) {
  const config = RESOURCE_REGISTRY[resource];
  updateContentRoutes.put(`/v1/admin/${resource}/:id`, requireRole('owner', 'editor'), (c) =>
    controller.handle(c, config),
  );
}
