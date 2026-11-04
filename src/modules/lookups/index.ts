import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { requireRole } from '@/middleware/require-role';
import type { AppEnv } from '@/types/env';
import { lookupCreateSchema, lookupUpdateSchema } from '@/validators/content';
import { createLookup, deleteLookup, listLookupGroups, updateLookup } from './lookups.service';

/** Master data: lookup groups and their values (`/v1/admin/lookups`). */
export const lookupsModuleRoutes = new OpenAPIHono<AppEnv>();

class LookupsController extends BaseController {
  list = async (c: Context<AppEnv>) => this.ok(c, await listLookupGroups(this.db(c)));

  create = async (c: Context<AppEnv>) => {
    const dto = await this.parseBody(c, lookupCreateSchema, 'Invalid lookup value');
    return this.ok(c, await createLookup(this.db(c), c.env, this.user(c), dto), undefined, 201);
  };

  update = async (c: Context<AppEnv>) => {
    const dto = await this.parseBody(c, lookupUpdateSchema, 'Invalid lookup value');
    return this.ok(c, await updateLookup(this.db(c), c.env, this.user(c), c.req.param('id')!, dto));
  };

  remove = async (c: Context<AppEnv>) => {
    await deleteLookup(this.db(c), c.env, this.user(c), c.req.param('id')!);
    return this.ok(c, { deleted: true });
  };
}

const controller = new LookupsController();
lookupsModuleRoutes.get('/v1/admin/lookups', requireRole('viewer'), controller.list);
lookupsModuleRoutes.post('/v1/admin/lookups', requireRole('editor'), controller.create);
lookupsModuleRoutes.put('/v1/admin/lookups/:id', requireRole('editor'), controller.update);
lookupsModuleRoutes.delete('/v1/admin/lookups/:id', requireRole('owner'), controller.remove);

const idParam = z.object({ id: z.string().uuid() });
export const lookupsDocs = [
  createRoute({
    method: 'get',
    path: '/v1/admin/lookups',
    tags: ['Admin Master Data'],
    summary: 'List lookup groups with their values',
    responses: { 200: { description: 'Groups with values' } },
  }),
  createRoute({
    method: 'post',
    path: '/v1/admin/lookups',
    tags: ['Admin Master Data'],
    summary: 'Add a value to a lookup group',
    request: { body: { content: { 'application/json': { schema: lookupCreateSchema } } } },
    responses: { 201: { description: 'Created value' }, 409: { description: 'Duplicate code' } },
  }),
  createRoute({
    method: 'put',
    path: '/v1/admin/lookups/{id}',
    tags: ['Admin Master Data'],
    summary: 'Relabel, reorder or (de)activate a value',
    request: { params: idParam, body: { content: { 'application/json': { schema: lookupUpdateSchema } } } },
    responses: { 200: { description: 'Updated value' }, 403: { description: 'System value' } },
  }),
  createRoute({
    method: 'delete',
    path: '/v1/admin/lookups/{id}',
    tags: ['Admin Master Data'],
    summary: 'Delete an unused, non-system value',
    request: { params: idParam },
    responses: { 200: { description: 'Deleted' }, 409: { description: 'Value still in use' } },
  }),
];
