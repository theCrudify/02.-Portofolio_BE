import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/types/env';
import { DetailPublicProjectController } from './detail-project.controller';
import { detailPublicProjectRouteDoc } from './detail-project.doc';

export const detailPublicProjectRoutes = new OpenAPIHono<AppEnv>({
  defaultHook: (result) => {
    if (!result.success) throw result.error;
  },
});
const controller = new DetailPublicProjectController();

detailPublicProjectRoutes.openapi(detailPublicProjectRouteDoc, controller.handle);
