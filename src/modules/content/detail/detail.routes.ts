import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import { RESOURCE_REGISTRY, type ResourceName } from '@/services/resource-registry';
import type { AppEnv } from '@/types/env';
import { DetailContentController } from './detail.controller';

export const detailContentRoutes = new OpenAPIHono<AppEnv>();
const controller = new DetailContentController();

for (const resource of Object.keys(RESOURCE_REGISTRY) as ResourceName[]) {
  const config = RESOURCE_REGISTRY[resource];
  detailContentRoutes.get(`/v1/admin/${resource}/:id`, requireRole('viewer'), (c) =>
    controller.handle(c, config),
  );
}
