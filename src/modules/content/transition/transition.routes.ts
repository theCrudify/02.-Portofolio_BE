import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import { RESOURCE_REGISTRY, type ResourceName } from '@/services/resource-registry';
import type { AppEnv } from '@/types/env';
import { TransitionContentController } from './transition.controller';

export const transitionContentRoutes = new OpenAPIHono<AppEnv>();
const controller = new TransitionContentController();

for (const resource of Object.keys(RESOURCE_REGISTRY) as ResourceName[]) {
  const config = RESOURCE_REGISTRY[resource];
  transitionContentRoutes.post(`/v1/admin/${resource}/:id/:action`, requireRole('owner'), (c) =>
    controller.handle(c, config),
  );
}
