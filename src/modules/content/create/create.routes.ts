import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import { RESOURCE_REGISTRY, type ResourceName } from '@/services/resource-registry';
import type { AppEnv } from '@/types/env';
import { CreateContentController } from './create.controller';

export const createContentRoutes = new OpenAPIHono<AppEnv>();
const controller = new CreateContentController();

for (const resource of Object.keys(RESOURCE_REGISTRY) as ResourceName[]) {
  const config = RESOURCE_REGISTRY[resource];
  createContentRoutes.post(`/v1/admin/${resource}`, requireRole('owner', 'editor'), (c) =>
    controller.handle(c, config),
  );
}
