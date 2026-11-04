import { OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { getDb } from '../../db/client';
import { signUpload, validateRegisteredMedia } from '../../lib/cloudinary';
import { AppError } from '../../lib/errors';
import { resolveVideoEmbed } from '../../lib/oembed';
import { ok } from '../../lib/response';
import { requireRole } from '../../middleware/require-role';
import { writeAuditLog } from '../../services/content.service';
import { revalidate } from '../../lib/revalidate';
import {
  createMedia,
  findMediaUsages,
  getMedia,
  listMedia,
  softDeleteMedia,
  updateMedia,
} from '../../services/media.service';
import type { AppBindings } from '../../types/env';

const signSchema = z.object({
  kind: z.enum(['image', 'video', 'document', 'pdf']),
});

const registerMediaSchema = z.object({
  kind: z.enum(['image', 'video', 'document', 'pdf']),
  publicId: z.string().min(1).max(255),
  url: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), 'URL must use https://'),
  mime: z.string().max(100).optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  bytes: z.number().int().positive().optional().nullable(),
  durationSec: z.number().int().nonnegative().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  captionsUrl: z.string().url().optional().nullable(),
  titleEn: z.string().max(160).optional().nullable(),
  titleId: z.string().max(160).optional().nullable(),
  altEn: z.string().max(300).optional().nullable(),
  altId: z.string().max(300).optional().nullable(),
});

const embedMediaSchema = z.object({
  url: z.string().url(),
  titleEn: z.string().max(160).optional().nullable(),
  titleId: z.string().max(160).optional().nullable(),
  altEn: z.string().max(300).optional().nullable(),
  altId: z.string().max(300).optional().nullable(),
});

const updateMediaSchema = z.object({
  titleEn: z.string().max(160).optional().nullable(),
  titleId: z.string().max(160).optional().nullable(),
  altEn: z.string().max(300).optional().nullable(),
  altId: z.string().max(300).optional().nullable(),
  captionsUrl: z.string().url().optional().nullable(),
});

const adminMedia = new OpenAPIHono<AppBindings>();

adminMedia.post('/v1/admin/media/sign', requireRole('owner', 'editor'), async (c) => {
  const body = await c.req.json();
  const parsed = signSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid media sign payload');
  }
  const signed = await signUpload(c.env, parsed.data.kind);
  return ok(c, signed);
});

adminMedia.post('/v1/admin/media', requireRole('owner', 'editor'), async (c) => {
  const body = await c.req.json();
  const parsed = registerMediaSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Invalid media registration payload',
      parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    );
  }

  validateRegisteredMedia({
    kind: parsed.data.kind,
    bytes: parsed.data.bytes,
    durationSec: parsed.data.durationSec,
  });

  const dbKind: 'image' | 'video' | 'pdf' =
    parsed.data.kind === 'document' ? 'pdf' : parsed.data.kind;

  const db = getDb(c.env);
  const user = c.get('user')!;
  const created = await createMedia(db, {
      provider: 'cloudinary',
      kind: dbKind,
      publicId: parsed.data.publicId,
      url: parsed.data.url,
      mime: parsed.data.mime ?? null,
      width: parsed.data.width ?? null,
      height: parsed.data.height ?? null,
      bytes: parsed.data.bytes ?? null,
      durationSec: parsed.data.durationSec ?? null,
      thumbnailUrl: parsed.data.thumbnailUrl ?? null,
      captionsUrl: parsed.data.captionsUrl ?? null,
      titleEn: parsed.data.titleEn ?? null,
      titleId: parsed.data.titleId ?? null,
      altEn: parsed.data.altEn ?? null,
      altId: parsed.data.altId ?? null,
      uploadedBy: user.id,
  });

  await writeAuditLog(db, {
    userId: user.id,
    action: 'create',
    resource: 'media',
    resourceId: created.id,
    summary: `Uploaded ${dbKind} (${parsed.data.publicId})`,
  });

  return ok(c, created, undefined, 201);
});

adminMedia.post('/v1/admin/media/embed', requireRole('owner', 'editor'), async (c) => {
  const body = await c.req.json();
  const parsed = embedMediaSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid video embed payload');
  }

  const resolved = await resolveVideoEmbed(parsed.data.url);
  const db = getDb(c.env);
  const user = c.get('user')!;

  const created = await createMedia(db, {
      provider: resolved.provider,
      kind: 'video',
      embedId: resolved.embedId,
      url: resolved.url,
      thumbnailUrl: resolved.thumbnailUrl,
      durationSec: resolved.durationSec,
      titleEn: parsed.data.titleEn ?? resolved.titleEn ?? null,
      titleId: parsed.data.titleId ?? null,
      altEn: parsed.data.altEn ?? null,
      altId: parsed.data.altId ?? null,
      uploadedBy: user.id,
  });

  await writeAuditLog(db, {
    userId: user.id,
    action: 'create',
    resource: 'media',
    resourceId: created.id,
    summary: `Embedded ${resolved.provider} video (${resolved.embedId})`,
  });

  return ok(c, created, undefined, 201);
});

adminMedia.get('/v1/admin/media', requireRole('viewer'), async (c) => {
  const rawKind = c.req.query('kind');
  const dbKind: 'image' | 'video' | 'pdf' | undefined =
    rawKind === 'document' || rawKind === 'pdf'
      ? 'pdf'
      : rawKind === 'image' || rawKind === 'video'
        ? rawKind
        : undefined;
  const { rows, meta } = await listMedia(getDb(c.env), {
    kind: dbKind,
    page: Number(c.req.query('page') ?? 1),
    limit: Number(c.req.query('limit') ?? 50),
  });
  return ok(c, rows, meta);
});

adminMedia.get('/v1/admin/media/:id', requireRole('viewer'), async (c) => {
  const row = await getMedia(getDb(c.env), c.req.param('id'));
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Media asset not found');
  return ok(c, row);
});

adminMedia.put('/v1/admin/media/:id', requireRole('owner', 'editor'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateMediaSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid media update payload');
  }

  const db = getDb(c.env);
  const user = c.get('user')!;
  const updated = await updateMedia(db, id, parsed.data);

  if (!updated) {
    throw new AppError(404, 'NOT_FOUND', 'Media asset not found');
  }

  await writeAuditLog(db, {
    userId: user.id,
    action: 'update',
    resource: 'media',
    resourceId: id,
    summary: 'Updated media metadata',
  });

  // Alt text and titles render on public pages.
  await revalidate(c.env, ['site', 'projects', 'certifications']);
  return ok(c, updated);
});

adminMedia.delete('/v1/admin/media/:id', requireRole('owner'), async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env);
  const user = c.get('user')!;

  const usages = await findMediaUsages(db, id);
  if (usages.length > 0) {
    throw new AppError(
      409,
      'CONFLICT',
      'Cannot delete media asset because it is still referenced by active content.',
      usages.map((u) => ({ path: u.resource, message: `Referenced by ${u.resource} (${u.id})` }))
    );
  }

  if (!(await softDeleteMedia(db, id))) {
    throw new AppError(404, 'NOT_FOUND', 'Media asset not found');
  }

  await writeAuditLog(db, {
    userId: user.id,
    action: 'delete',
    resource: 'media',
    resourceId: id,
    summary: 'Soft-deleted media asset',
  });

  return c.body(null, 204);
});

export default adminMedia;
