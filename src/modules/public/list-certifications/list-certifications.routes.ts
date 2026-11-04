import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/types/env';
import { ListPublicCertificationsController } from './list-certifications.controller';
import { listPublicCertificationsRouteDoc } from './list-certifications.doc';

export const listPublicCertificationsRoutes = new OpenAPIHono<AppEnv>({
  defaultHook: (result) => {
    if (!result.success) throw result.error;
  },
});
const controller = new ListPublicCertificationsController();

listPublicCertificationsRoutes.openapi(listPublicCertificationsRouteDoc, controller.handle);
