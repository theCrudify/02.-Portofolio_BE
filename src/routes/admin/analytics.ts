import { OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { getDb } from '../../db/client';
import { AppError } from '../../lib/errors';
import { ok } from '../../lib/response';
import { requireRole } from '../../middleware/require-role';
import {
  getAdminAnalytics,
  listAdminMessages,
  updateAdminMessage,
} from '../../services/analytics.service';
import type { AppBindings } from '../../types/env';

const patchMessageSchema = z.object({
  isRead: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

const adminAnalytics = new OpenAPIHono<AppBindings>();

adminAnalytics.get('/v1/admin/analytics', requireRole('owner', 'editor'), async (c) => {
  const rangeParam = c.req.query('range');
  const range =
    rangeParam === '7d' || rangeParam === '30d' || rangeParam === '90d' ? rangeParam : '30d';
  const db = getDb(c.env);
  const data = await getAdminAnalytics(db, range);
  return ok(c, data);
});

adminAnalytics.get('/v1/admin/messages', requireRole('owner', 'editor'), async (c) => {
  const db = getDb(c.env);
  const rows = await listAdminMessages(db);
  return ok(c, rows);
});

adminAnalytics.patch('/v1/admin/messages/:id', requireRole('owner', 'editor'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = patchMessageSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid message update payload');
  }
  const db = getDb(c.env);
  const updated = await updateAdminMessage(db, id, parsed.data);
  if (!updated) {
    throw new AppError(404, 'NOT_FOUND', 'Message not found');
  }
  return ok(c, updated);
});

export default adminAnalytics;
