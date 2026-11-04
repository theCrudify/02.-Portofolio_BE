import { OpenAPIHono } from '@hono/zod-openapi';
import { requireRole } from '@/middleware/require-role';
import type { AppEnv } from '@/types/env';
import { RelationsContentController } from './relations.controller';

export const relationsContentRoutes = new OpenAPIHono<AppEnv>();
const controller = new RelationsContentController();

relationsContentRoutes.put(
  '/v1/admin/projects/:id/technologies',
  requireRole('owner', 'editor'),
  (c) => controller.handleProjectTechnologies(c),
);
relationsContentRoutes.put('/v1/admin/projects/:id/links', requireRole('owner', 'editor'), (c) =>
  controller.handleProjectLinks(c),
);
relationsContentRoutes.put('/v1/admin/projects/:id/media', requireRole('owner', 'editor'), (c) =>
  controller.handleProjectMedia(c),
);
relationsContentRoutes.put(
  '/v1/admin/experiences/:id/technologies',
  requireRole('owner', 'editor'),
  (c) => controller.handleExperienceTechnologies(c),
);
