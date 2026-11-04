import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/types/env';
import { GetSiteController } from './site.controller';
import { getSiteRouteDoc } from './site.doc';

export const getSiteRoutes = new OpenAPIHono<AppEnv>({
  defaultHook: (result) => {
    if (!result.success) throw result.error;
  },
});
const controller = new GetSiteController();

getSiteRoutes.openapi(getSiteRouteDoc, controller.handle);
