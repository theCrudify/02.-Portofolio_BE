import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/types/env';
import { ListPublicProjectsController } from './list-projects.controller';
import { listPublicProjectsRouteDoc } from './list-projects.doc';

export const listPublicProjectsRoutes = new OpenAPIHono<AppEnv>({
  defaultHook: (result) => {
    if (!result.success) throw result.error;
  },
});
const controller = new ListPublicProjectsController();

listPublicProjectsRoutes.openapi(listPublicProjectsRouteDoc, controller.handle);
