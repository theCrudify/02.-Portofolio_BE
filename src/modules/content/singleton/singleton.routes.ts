import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppEnv } from '@/types/env';
import { SingletonContentController } from './singleton.controller';

export const singletonContentRoutes = new OpenAPIHono<AppEnv>();
const controller = new SingletonContentController();

singletonContentRoutes.get('/v1/admin/dashboard', requireRole('viewer'), (c) =>
  controller.handleGetDashboard(c),
);
singletonContentRoutes.get('/v1/admin/profile', requireRole('viewer'), (c) =>
  controller.handleGetProfile(c),
);
singletonContentRoutes.put('/v1/admin/profile', requireRole('editor'), (c) =>
  controller.handleUpdateProfile(c),
);
singletonContentRoutes.get('/v1/admin/settings', requireRole('viewer'), (c) =>
  controller.handleGetSettings(c),
);
singletonContentRoutes.put('/v1/admin/settings', requireRole('owner'), (c) =>
  controller.handleUpdateSettings(c),
);
