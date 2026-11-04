import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/types/env';
import { detailPublicProjectRoutes } from './detail-project';
import { listPublicCertificationsRoutes } from './list-certifications';
import { listPublicProjectsRoutes } from './list-projects';
import { getSiteRoutes } from './site';

export const publicModuleRoutes = new OpenAPIHono<AppEnv>({
  defaultHook: (result) => {
    if (!result.success) throw result.error;
  },
});

publicModuleRoutes.route('/', getSiteRoutes);
publicModuleRoutes.route('/', listPublicProjectsRoutes);
publicModuleRoutes.route('/', detailPublicProjectRoutes);
publicModuleRoutes.route('/', listPublicCertificationsRoutes);

export * from './site';
export * from './list-projects';
export * from './detail-project';
export * from './list-certifications';
