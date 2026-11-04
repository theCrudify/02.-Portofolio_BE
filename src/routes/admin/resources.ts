import { OpenAPIHono } from '@hono/zod-openapi';
import { getDb } from '../../db/client';
import { ApiError } from '../../lib/errors';
import { ok } from '../../lib/response';
import { requireRole } from '../../middleware/require-role';
import {
  RESOURCE_REGISTRY,
  type ResourceName,
} from '../../services/resource-registry';
import {
  listResource,
  getResourceById,
  createResource,
  updateResource,
  transitionResource,
  softDeleteResource,
  deletePermanentResource,
  reorderResource,
  getAdminProfile,
  updateAdminProfile,
  getAdminSiteSettings,
  updateAdminSiteSettings,
  replaceProjectTechnologies,
  replaceProjectLinks,
  replaceProjectMedia,
  replaceExperienceTechnologies,
  getAdminDashboardSummary,
  type ContentStatus,
  type TransitionAction,
} from '../../services/content.service';
import {
  reorderSchema,
  profileUpdateSchema,
  siteSettingsUpdateSchema,
  projectTechnologiesSchema,
  projectLinksSchema,
  projectMediaSchema,
  experienceTechnologiesSchema,
} from '../../validators/content';
import type { AppBindings } from '../../types/env';

const adminResources = new OpenAPIHono<AppBindings>();

adminResources.get('/v1/admin/dashboard', requireRole('viewer'), async (c) => {
  const db = getDb(c.env);
  const summary = await getAdminDashboardSummary(db);
  return ok(c, summary);
});

adminResources.get('/v1/admin/profile', requireRole('viewer'), async (c) => {
  const db = getDb(c.env);
  const data = await getAdminProfile(db);
  return ok(c, data);
});

adminResources.put('/v1/admin/profile', requireRole('editor'), async (c) => {
  const body = await c.req.json();
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Invalid profile payload',
      parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    );
  }
  const db = getDb(c.env);
  const user = c.get('user')!;
  const updated = await updateAdminProfile(db, c.env, user, parsed.data);
  return ok(c, updated);
});

adminResources.get('/v1/admin/settings', requireRole('viewer'), async (c) => {
  const db = getDb(c.env);
  const data = await getAdminSiteSettings(db);
  return ok(c, data);
});

adminResources.put('/v1/admin/settings', requireRole('owner'), async (c) => {
  const body = await c.req.json();
  const parsed = siteSettingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Invalid site settings payload',
      parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    );
  }
  const db = getDb(c.env);
  const user = c.get('user')!;
  const updated = await updateAdminSiteSettings(db, c.env, user, parsed.data);
  return ok(c, updated);
});

adminResources.put(
  '/v1/admin/projects/:id/technologies',
  requireRole('owner', 'editor'),
  async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = projectTechnologiesSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid project technologies payload');
    }
    const db = getDb(c.env);
    const user = c.get('user')!;
    await replaceProjectTechnologies(db, c.env, user, id, parsed.data.items);
    return ok(c, { updated: true });
  }
);

adminResources.put('/v1/admin/projects/:id/links', requireRole('owner', 'editor'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = projectLinksSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid project links payload');
  }
  const db = getDb(c.env);
  const user = c.get('user')!;
  await replaceProjectLinks(db, c.env, user, id, parsed.data.items);
  return ok(c, { updated: true });
});

adminResources.put('/v1/admin/projects/:id/media', requireRole('owner', 'editor'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = projectMediaSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid project media payload');
  }
  const db = getDb(c.env);
  const user = c.get('user')!;
  await replaceProjectMedia(db, c.env, user, id, parsed.data.items);
  return ok(c, { updated: true });
});

adminResources.put(
  '/v1/admin/experiences/:id/technologies',
  requireRole('owner', 'editor'),
  async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = experienceTechnologiesSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid experience technologies payload');
    }
    const db = getDb(c.env);
    const user = c.get('user')!;
    await replaceExperienceTechnologies(db, c.env, user, id, parsed.data.technologyIds);
    return ok(c, { updated: true });
  }
);

for (const resource of Object.keys(RESOURCE_REGISTRY) as ResourceName[]) {
  const config = RESOURCE_REGISTRY[resource];

  adminResources.put(`/v1/admin/${resource}/reorder`, requireRole('editor'), async (c) => {
    const body = await c.req.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid reorder payload');
    }
    const db = getDb(c.env);
    const user = c.get('user')!;
    await reorderResource(db, c.env, user, config, parsed.data.ids);
    return ok(c, { reordered: parsed.data.ids.length });
  });

  adminResources.get(`/v1/admin/${resource}`, requireRole('viewer'), async (c) => {
    const status = c.req.query('status') as ContentStatus | undefined;
    const includeDeleted =
      c.req.query('includeDeleted') === 'true' && c.get('user')?.role === 'owner';
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 50);

    const db = getDb(c.env);
    const result = await listResource(db, config, { status, includeDeleted, page, limit });
    return ok(c, result.data, result.meta);
  });

  adminResources.post(`/v1/admin/${resource}`, requireRole('owner', 'editor'), async (c) => {
    const body = await c.req.json();
    const parsed = config.createSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Validation failed',
        parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      );
    }
    const db = getDb(c.env);
    const user = c.get('user')!;
    const created = await createResource(
      db,
      c.env,
      user,
      config,
      parsed.data as Record<string, unknown>
    );
    return ok(c, created, undefined, 201);
  });

  adminResources.get(`/v1/admin/${resource}/:id`, requireRole('viewer'), async (c) => {
    const id = c.req.param('id');
    const db = getDb(c.env);
    const item = await getResourceById(db, config, id);
    return ok(c, item);
  });

  adminResources.put(`/v1/admin/${resource}/:id`, requireRole('owner', 'editor'), async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = config.updateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Validation failed',
        parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      );
    }
    const db = getDb(c.env);
    const user = c.get('user')!;
    const updated = await updateResource(
      db,
      c.env,
      user,
      config,
      id,
      parsed.data as Record<string, unknown>
    );
    return ok(c, updated);
  });

  adminResources.delete(`/v1/admin/${resource}/:id`, requireRole('editor'), async (c) => {
    const id = c.req.param('id');
    const db = getDb(c.env);
    const user = c.get('user')!;
    await softDeleteResource(db, c.env, user, config, id);
    return c.body(null, 204);
  });

  adminResources.delete(`/v1/admin/${resource}/:id/permanent`, requireRole('owner'), async (c) => {
    const id = c.req.param('id');
    const db = getDb(c.env);
    const user = c.get('user')!;
    await deletePermanentResource(db, c.env, user, config, id);
    return c.body(null, 204);
  });

  adminResources.post(`/v1/admin/${resource}/:id/:action`, requireRole('owner'), async (c) => {
    const id = c.req.param('id');
    const action = c.req.param('action') as TransitionAction;
    if (!['publish', 'unpublish', 'archive', 'restore'].includes(action)) {
      throw new ApiError(404, 'NOT_FOUND', `Unknown action "${action}".`);
    }
    const db = getDb(c.env);
    const user = c.get('user')!;
    const item = await transitionResource(db, c.env, user, config, id, action);
    return ok(c, item);
  });
}

export default adminResources;
