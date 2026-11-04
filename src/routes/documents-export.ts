import { OpenAPIHono } from '@hono/zod-openapi';
import { getDb } from '../db/client';
import { AppError } from '../lib/errors';
import { getHashSalt, visitorHash } from '../lib/hash';
import { parseLocale } from '../lib/locale';
import { ok } from '../lib/response';
import {
  getActiveDocument,
  getDocumentWithMedia,
  getPresetById,
  getPresetBySlug,
  getShareLinkByToken,
  recordShareOpen,
} from '../services/document.service';
import { buildExport, buildJsonResume, type ExportPresetRow } from '../services/export.service';
import type { AppBindings } from '../types/env';

export const documentsExportRoute = new OpenAPIHono<AppBindings>();

documentsExportRoute.get('/v1/documents/cv', async (c) => {
  const locale = parseLocale(c.req.query('locale'));
  const typeParam = c.req.query('type');
  const docType: 'cv' | 'portfolio_pdf' | 'other' =
    typeParam === 'portfolio_pdf' || typeParam === 'other' ? typeParam : 'cv';


  const found = await getActiveDocument(getDb(c.env), docType, locale);
  if (!found) {
    throw new AppError(404, 'NOT_FOUND', `No active ${docType} document found for locale ${locale}`);
  }
  const { doc, asset } = found;

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

  const preset = await getPresetBySlug(db, slug);

  if (!preset || !preset.isPublic) {
    throw new AppError(404, 'NOT_FOUND', `Public export preset "${slug}" not found.`);
  }

  const payload = await buildExport(db, preset as unknown as ExportPresetRow, localeOverride);
  return ok(c, payload);
});

documentsExportRoute.get('/v1/share/:token', async (c) => {
  const token = c.req.param('token');
  const db = getDb(c.env);

  const link = await getShareLinkByToken(db, token);

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

  const rawIp =
    c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? '127.0.0.1';
  const ua = c.req.header('user-agent') ?? '';
  const vHash = await visitorHash(rawIp, ua, now.toISOString().slice(0, 10), getHashSalt(c.env));
  await recordShareOpen(db, link.id, token, vHash);

  if (link.documentId) {
    const document = await getDocumentWithMedia(db, link.documentId);

    return ok(c, {
      kind: 'document',
      label: link.label,
      expiresAt: link.expiresAt,
      document,
    });
  }

  if (link.presetId) {
    const preset = await getPresetById(db, link.presetId);
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
