import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import { RESOURCE_REGISTRY, type ResourceName } from '@/services/resource-registry';
import type { AppEnv } from '@/types/env';
import { ReorderContentController } from './reorder.controller';

export const reorderContentRoutes = new OpenAPIHono<AppEnv>();
const controller = new ReorderContentController();

for (const resource of Object.keys(RESOURCE_REGISTRY) as ResourceName[]) {
  const config = RESOURCE_REGISTRY[resource];
  reorderContentRoutes.put(`/v1/admin/${resource}/reorder`, requireRole('editor'), (c) =>
    controller.handle(c, config),
  );
}
