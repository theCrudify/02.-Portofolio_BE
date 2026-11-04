import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import { RESOURCE_REGISTRY, type ResourceName } from '@/services/resource-registry';
import type { AppEnv } from '@/types/env';
import { ListContentController } from './list.controller';

export const listContentRoutes = new OpenAPIHono<AppEnv>();
const controller = new ListContentController();

for (const resource of Object.keys(RESOURCE_REGISTRY) as ResourceName[]) {
  const config = RESOURCE_REGISTRY[resource];
  listContentRoutes.get(`/v1/admin/${resource}`, requireRole('viewer'), (c) =>
    controller.handle(c, config),
  );
}
