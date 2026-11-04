import { OpenAPIHono } from '@hono/zod-openapi';
import { getDb } from '@/db/client';
import { ok } from '@/lib/response';
import { requireAuth } from '@/middleware/auth';
import { requireRole } from '@/middleware/require-role';
import {
  createUserAccount,
  deleteUserAccount,
  listUsers,
  updateUserAccount,
} from '@/services/auth.service';
import type { AppEnv } from '@/types/env';
import {
  createUserBodySchema,
  updateUserBodySchema,
  userIdParamSchema,
} from '@/validators/auth';

export const adminUsersRoute = new OpenAPIHono<AppEnv>();

adminUsersRoute.use('*', requireAuth, requireRole('owner'));

adminUsersRoute.get('/', async (c) => {
  const db = getDb(c.env);
  const items = await listUsers(db);
  return ok(c, items);
});

adminUsersRoute.post('/', async (c) => {
  const body = createUserBodySchema.parse(await c.req.json());
  const actor = c.get('user')!;
  const db = getDb(c.env);
  const created = await createUserAccount(db, actor, body);
  return ok(c, created, undefined, 201);
});

adminUsersRoute.put('/:id', async (c) => {
  const { id } = userIdParamSchema.parse({ id: c.req.param('id') });
  const body = updateUserBodySchema.parse(await c.req.json());
  const actor = c.get('user')!;
  const db = getDb(c.env);
  const updated = await updateUserAccount(db, actor, id, body);
  return ok(c, updated);
});

adminUsersRoute.delete('/:id', async (c) => {
  const { id } = userIdParamSchema.parse({ id: c.req.param('id') });
  const actor = c.get('user')!;
  const db = getDb(c.env);
  await deleteUserAccount(db, actor, id);
  return c.body(null, 204);
});
