import { OpenAPIHono } from '@hono/zod-openapi';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, type Database } from '../../db/client';
import {
  media,
  profile,
  siteSettings,
  projects,
  projectMedia,
  experiences,
  education,
  certifications,
  activities,
  achievements,
  publications,
  testimonials,
  documents,
} from '../../db/schema';
import { signUpload, validateRegisteredMedia } from '../../lib/cloudinary';
import { AppError } from '../../lib/errors';
import { resolveVideoEmbed } from '../../lib/oembed';
import { ok } from '../../lib/response';
import { requireRole } from '../../middleware/require-role';
import { writeAuditLog } from '../../services/content.service';
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

export async function findMediaUsages(
  db: Database,
  mediaId: string
): Promise<{ resource: string; id: string }[]> {
  const usages: { resource: string; id: string }[] = [];

  const profRows = await db
    .select()
    .from(profile)
    .where(eq(profile.avatarMediaId, mediaId));
  for (const r of profRows) usages.push({ resource: 'profile', id: String(r.id) });

  const settingsRows = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.ogMediaId, mediaId));
  for (const r of settingsRows) usages.push({ resource: 'site_settings', id: String(r.id) });

  const projCover = await db
    .select()
    .from(projects)
    .where(and(eq(projects.coverMediaId, mediaId), isNull(projects.deletedAt)));
  for (const r of projCover) usages.push({ resource: 'projects', id: r.id });

  const projMediaRows = await db
    .select()
    .from(projectMedia)
    .where(eq(projectMedia.mediaId, mediaId));
  for (const r of projMediaRows) usages.push({ resource: 'project_media', id: r.projectId });

  const expRows = await db
    .select()
    .from(experiences)
    .where(and(eq(experiences.companyMediaId, mediaId), isNull(experiences.deletedAt)));
  for (const r of expRows) usages.push({ resource: 'experiences', id: r.id });

  const eduRows = await db
    .select()
    .from(education)
    .where(and(eq(education.logoMediaId, mediaId), isNull(education.deletedAt)));
  for (const r of eduRows) usages.push({ resource: 'education', id: r.id });

  const certRows = await db
    .select()
    .from(certifications)
    .where(and(eq(certifications.imageMediaId, mediaId), isNull(certifications.deletedAt)));
  for (const r of certRows) usages.push({ resource: 'certifications', id: r.id });

  const actRows = await db
    .select()
    .from(activities)
    .where(and(eq(activities.mediaId, mediaId), isNull(activities.deletedAt)));
  for (const r of actRows) usages.push({ resource: 'activities', id: r.id });

  const achRows = await db
    .select()
    .from(achievements)
    .where(and(eq(achievements.certificateMediaId, mediaId), isNull(achievements.deletedAt)));
  for (const r of achRows) usages.push({ resource: 'achievements', id: r.id });

  const pubRows = await db
    .select()
    .from(publications)
    .where(and(eq(publications.videoMediaId, mediaId), isNull(publications.deletedAt)));
  for (const r of pubRows) usages.push({ resource: 'publications', id: r.id });

  const testRows = await db
    .select()
    .from(testimonials)
    .where(and(eq(testimonials.avatarMediaId, mediaId), isNull(testimonials.deletedAt)));
  for (const r of testRows) usages.push({ resource: 'testimonials', id: r.id });

  const docRows = await db
    .select()
    .from(documents)
    .where(eq(documents.mediaId, mediaId));
  for (const r of docRows) usages.push({ resource: 'documents', id: r.id });

  return usages;
}

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
  const [created] = await db
    .insert(media)
    .values({
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
    })
    .returning();

  await writeAuditLog(db, {
    userId: user.id,
    action: 'create',
    resource: 'media',
    resourceId: created!.id,
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

  const [created] = await db
    .insert(media)
    .values({
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
    })
    .returning();

  await writeAuditLog(db, {
    userId: user.id,
    action: 'create',
    resource: 'media',
    resourceId: created!.id,
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
  const page = Math.max(1, Number(c.req.query('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 50)));
  const offset = (page - 1) * limit;

  const db = getDb(c.env);
  const conds = [isNull(media.deletedAt)];
  if (dbKind) {
    conds.push(eq(media.kind, dbKind));
  }

  const rows = await db
    .select()
    .from(media)
    .where(and(...conds))
    .orderBy(desc(media.createdAt))
    .limit(limit)
    .offset(offset);

  return ok(c, rows, { page, limit, total: rows.length });
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
  const [updated] = await db
    .update(media)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(media.id, id))
    .returning();

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

  await db
    .update(media)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(media.id, id));

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
