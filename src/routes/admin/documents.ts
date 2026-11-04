import { OpenAPIHono } from '@hono/zod-openapi';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/client';
import { documents, exportPresets, shareLinks } from '../../db/schema';
import { AppError } from '../../lib/errors';
import { revalidate } from '../../lib/revalidate';
import { ok } from '../../lib/response';
import { requireRole } from '../../middleware/require-role';
import { writeAuditLog } from '../../services/content.service';
import type { AppBindings } from '../../types/env';

const createDocumentSchema = z.object({
  mediaId: z.string().uuid(),
  type: z.enum(['cv', 'portfolio_pdf', 'other']).default('cv'),
  locale: z.enum(['en', 'id']),
  title: z.string().min(1).max(120),
  version: z.number().int().positive().default(1),
  pageCount: z.number().int().positive().optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
});


const presetSchema = z.object({
  slug: z.string().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(80),
  template: z.enum(['full', 'one_page', 'ats']).default('full'),
  locale: z.enum(['en', 'id']).default('en'),
  sections: z
    .array(
      z.object({
        key: z.string().min(1).max(40),
        limit: z.number().int().positive().optional(),
      })
    )
    .min(1)
    .max(20),
  itemFilter: z
    .object({
      featuredOnly: z.boolean().optional(),
      sinceYears: z.number().int().positive().optional(),
      technologyIds: z.array(z.string().uuid()).optional(),
    })
    .optional(),
  isPublic: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const createShareLinkSchema = z
  .object({
    label: z.string().min(1).max(120),
    documentId: z.string().uuid().optional().nullable(),
    presetId: z.string().uuid().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
  })
  .refine((d) => Boolean(d.documentId) !== Boolean(d.presetId), {
    message: 'Exactly one of documentId or presetId must be provided.',
  });

const updateShareLinkSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export function generateShareToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const adminDocuments = new OpenAPIHono<AppBindings>();

adminDocuments.get('/v1/admin/documents', requireRole('owner', 'editor'), async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(documents).orderBy(desc(documents.createdAt));
  return ok(c, rows);
});

adminDocuments.post('/v1/admin/documents', requireRole('owner', 'editor'), async (c) => {
  const body = await c.req.json();
  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid document payload');
  }
  const db = getDb(c.env);
  const user = c.get('user')!;
  const [created] = await db
    .insert(documents)
    .values({
      ...parsed.data,
      isActive: false,
    })
    .returning();

  await writeAuditLog(db, {
    userId: user.id,
    action: 'create',
    resource: 'documents',
    resourceId: created!.id,
    summary: `Registered ${parsed.data.type} (${parsed.data.locale})`,
  });

  return ok(c, created, undefined, 201);
});

adminDocuments.post('/v1/admin/documents/:id/activate', requireRole('owner'), async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env);
  const user = c.get('user')!;

  const allDocs = await db.select().from(documents);
  const target = allDocs.find((d) => d.id === id);
  if (!target) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  // Deactivate previous active document of same type + locale
  await db
    .update(documents)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(documents.type, target.type), eq(documents.locale, target.locale)));

  const [activated] = await db
    .update(documents)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(documents.id, id))
    .returning();

  await writeAuditLog(db, {
    userId: user.id,
    action: 'update',
    resource: 'documents',
    resourceId: id,
    summary: `Activated ${target.type} (${target.locale})`,
  });

  await revalidate(c.env, ['site', 'documents']);
  return ok(c, activated);
});

adminDocuments.delete('/v1/admin/documents/:id', requireRole('owner'), async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env);
  const user = c.get('user')!;
  await db.delete(documents).where(eq(documents.id, id));
  await writeAuditLog(db, {
    userId: user.id,
    action: 'delete',
    resource: 'documents',
    resourceId: id,
    summary: 'Deleted document record',
  });
  return c.body(null, 204);
});

adminDocuments.get('/v1/admin/export-presets', requireRole('owner', 'editor'), async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(exportPresets).orderBy(desc(exportPresets.createdAt));
  return ok(c, rows);
});

adminDocuments.post('/v1/admin/export-presets', requireRole('owner'), async (c) => {
  const body = await c.req.json();
  const parsed = presetSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid export preset payload');
  }
  const db = getDb(c.env);
  const user = c.get('user')!;
  const [created] = await db
    .insert(exportPresets)
    .values({
      ...parsed.data,
      itemFilter: parsed.data.itemFilter ?? {},
    })
    .returning();

  await writeAuditLog(db, {
    userId: user.id,
    action: 'create',
    resource: 'export_presets',
    resourceId: created!.id,
    summary: `Created export preset ${parsed.data.slug}`,
  });

  return ok(c, created, undefined, 201);
});

adminDocuments.put('/v1/admin/export-presets/:id', requireRole('owner'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = presetSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid export preset payload');
  }
  const db = getDb(c.env);
  const user = c.get('user')!;
  const [updated] = await db
    .update(exportPresets)
    .set({
      ...parsed.data,
      itemFilter: parsed.data.itemFilter ?? {},
      updatedAt: new Date(),
    })
    .where(eq(exportPresets.id, id))
    .returning();

  await writeAuditLog(db, {
    userId: user.id,
    action: 'update',
    resource: 'export_presets',
    resourceId: id,
    summary: `Updated export preset ${parsed.data.slug}`,
  });

  return ok(c, updated);
});

adminDocuments.delete('/v1/admin/export-presets/:id', requireRole('owner'), async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env);
  const user = c.get('user')!;
  await db.delete(exportPresets).where(eq(exportPresets.id, id));
  await writeAuditLog(db, {
    userId: user.id,
    action: 'delete',
    resource: 'export_presets',
    resourceId: id,
    summary: 'Deleted export preset',
  });
  return c.body(null, 204);
});

adminDocuments.get('/v1/admin/share-links', requireRole('owner', 'editor'), async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(shareLinks).orderBy(desc(shareLinks.createdAt));
  return ok(c, rows);
});

adminDocuments.post('/v1/admin/share-links', requireRole('owner', 'editor'), async (c) => {
  const body = await c.req.json();
  const parsed = createShareLinkSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid share link payload');
  }
  const db = getDb(c.env);
  const user = c.get('user')!;
  const token = generateShareToken();

  const [created] = await db
    .insert(shareLinks)
    .values({
      token,
      label: parsed.data.label,
      documentId: parsed.data.documentId ?? null,
      presetId: parsed.data.presetId ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      isActive: true,
      viewCount: 0,
      createdBy: user.id,
    })
    .returning();

  await writeAuditLog(db, {
    userId: user.id,
    action: 'create',
    resource: 'share_links',
    resourceId: created!.id,
    summary: `Created share link "${parsed.data.label}"`,
  });

  return ok(c, created, undefined, 201);
});

adminDocuments.patch('/v1/admin/share-links/:id', requireRole('owner', 'editor'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateShareLinkSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid share link update payload');
  }
  const db = getDb(c.env);
  const [updated] = await db
    .update(shareLinks)
    .set({
      ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(parsed.data.expiresAt !== undefined
        ? { expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(shareLinks.id, id))
    .returning();

  return ok(c, updated);
});

adminDocuments.delete('/v1/admin/share-links/:id', requireRole('owner'), async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env);
  await db.delete(shareLinks).where(eq(shareLinks.id, id));
  return c.body(null, 204);
});

export default adminDocuments;
