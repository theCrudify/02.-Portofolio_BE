import { OpenAPIHono } from '@hono/zod-openapi';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { documents, events, exportPresets, media, shareLinks } from '../db/schema';
import { AppError } from '../lib/errors';
import { getHashSalt, visitorHash } from '../lib/hash';
import { parseLocale } from '../lib/locale';
import { ok } from '../lib/response';
import { buildExport, buildJsonResume, type ExportPresetRow } from '../services/export.service';
import type { AppBindings } from '../types/env';

export const documentsExportRoute = new OpenAPIHono<AppBindings>();

documentsExportRoute.get('/v1/documents/cv', async (c) => {
  const locale = parseLocale(c.req.query('locale'));
  const typeParam = c.req.query('type');
  const docType: 'cv' | 'portfolio_pdf' | 'other' =
    typeParam === 'portfolio_pdf' || typeParam === 'other' ? typeParam : 'cv';


  const db = getDb(c.env);
  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.type, docType), eq(documents.locale, locale), eq(documents.isActive, true)));

  const doc = rows.find(
    (r) => r.type === docType && r.locale === locale && r.isActive === true
  );
  if (!doc) {
    throw new AppError(404, 'NOT_FOUND', `No active ${docType} document found for locale ${locale}`);
  }

  const mediaRows = await db.select().from(media).where(eq(media.id, doc.mediaId));
  const asset = mediaRows.find((m) => m.id === doc.mediaId) ?? null;

  return ok(c, {
    ...doc,
    media: asset,
    downloadUrl: asset?.url ?? null,
  });
});

documentsExportRoute.get('/v1/export/resume.json', async (c) => {
  const locale = parseLocale(c.req.query('locale'));
  const db = getDb(c.env);
  const resume = await buildJsonResume(db, locale);
  return ok(c, resume);
});

documentsExportRoute.get('/v1/export/:presetSlug', async (c) => {
  const slug = c.req.param('presetSlug');
  const localeOverride = c.req.query('locale') as 'en' | 'id' | undefined;
  const db = getDb(c.env);

  const rows = await db
    .select()
    .from(exportPresets)
    .where(eq(exportPresets.slug, slug));
  const preset = rows.find((p) => p.slug === slug);

  if (!preset || !preset.isPublic) {
    throw new AppError(404, 'NOT_FOUND', `Public export preset "${slug}" not found.`);
  }

  const payload = await buildExport(db, preset as unknown as ExportPresetRow, localeOverride);
  return ok(c, payload);
});

documentsExportRoute.get('/v1/share/:token', async (c) => {
  const token = c.req.param('token');
  const db = getDb(c.env);

  const rows = await db.select().from(shareLinks).where(eq(shareLinks.token, token));
  const link = rows.find((l) => l.token === token);

  if (!link) {
    throw new AppError(404, 'NOT_FOUND', 'Share link not found.');
  }

  const now = new Date();
  const isExpired =
    link.expiresAt &&
    (link.expiresAt instanceof Date
      ? link.expiresAt.getTime() < now.getTime()
      : new Date(String(link.expiresAt)).getTime() < now.getTime());

  if (!link.isActive || isExpired) {
    throw new AppError(410, 'SHARE_LINK_EXPIRED', 'This share link has expired or been deactivated.');
  }

  // Increment viewCount & lastOpenedAt
  await db
    .update(shareLinks)
    .set({
      viewCount: (link.viewCount ?? 0) + 1,
      lastOpenedAt: now,
      updatedAt: now,
    })
    .where(eq(shareLinks.id, link.id));

  // Record share_open event
  const rawIp =
    c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? '127.0.0.1';
  const ua = c.req.header('user-agent') ?? '';
  const utcDate = now.toISOString().slice(0, 10);
  const vHash = await visitorHash(rawIp, ua, utcDate, getHashSalt(c.env));

  await db.insert(events).values({
    type: 'share_open',
    path: `/s/${token}`,
    shareLinkId: link.id,
    visitorHash: vHash,
  });

  if (link.documentId) {
    const docRows = await db.select().from(documents).where(eq(documents.id, link.documentId));
    const doc = docRows.find((d) => d.id === link.documentId) ?? null;
    const mediaRows = doc
      ? await db.select().from(media).where(eq(media.id, doc.mediaId))
      : [];
    const asset = doc ? (mediaRows.find((m) => m.id === doc.mediaId) ?? null) : null;

    return ok(c, {
      kind: 'document',
      label: link.label,
      expiresAt: link.expiresAt,
      document: doc ? { ...doc, media: asset } : null,
    });
  }

  if (link.presetId) {
    const presetRows = await db
      .select()
      .from(exportPresets)
      .where(eq(exportPresets.id, link.presetId));
    const preset = presetRows.find((p) => p.id === link.presetId);
    if (!preset) {
      throw new AppError(404, 'NOT_FOUND', 'Export preset for share link not found.');
    }
    const exportData = await buildExport(db, preset as unknown as ExportPresetRow);
    return ok(c, {
      kind: 'preset',
      label: link.label,
      expiresAt: link.expiresAt,
      export: exportData,
    });
  }

  throw new AppError(404, 'NOT_FOUND', 'Share link target not found.');
});
