import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import { AppError } from '@/lib/errors';
import { getHashSalt, visitorHash } from '@/lib/hash';
import type { ExportPresetRow } from '@/services/export.service';
import type { Env } from '@/types/env';
import { ExportDocumentsRepository } from './export.repository';

export class ExportDocumentsService extends BaseService {
  protected override readonly repo: ExportDocumentsRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new ExportDocumentsRepository(db);
  }

  async getActiveCv(docType: 'cv' | 'portfolio_pdf' | 'other', locale: 'en' | 'id') {
    const found = await this.repo.findActiveDocument(docType, locale);
    if (!found) {
      throw new AppError(404, 'NOT_FOUND', `No active ${docType} document found for locale ${locale}`);
    }
    const { doc, asset } = found;
    return {
      ...doc,
      media: asset,
      downloadUrl: asset?.url ?? null,
    };
  }

  async getJsonResume(locale: 'en' | 'id') {
    return this.repo.buildResume(locale);
  }

  async getPresetExport(slug: string, localeOverride?: 'en' | 'id') {
    const preset = await this.repo.findPresetBySlug(slug);
    if (!preset || !preset.isPublic) {
      throw new AppError(404, 'NOT_FOUND', `Public export preset "${slug}" not found.`);
    }
    return this.repo.buildExportPayload(preset as unknown as ExportPresetRow, localeOverride);
  }

  async resolveShareToken(token: string, rawIp: string, ua: string, env: Env) {
    const link = await this.repo.findShareLinkByToken(token);
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

    const vHash = await visitorHash(rawIp, ua, now.toISOString().slice(0, 10), getHashSalt(env));
    await this.repo.recordShareLinkOpen(link.id, token, vHash);

    if (link.documentId) {
      const document = await this.repo.findDocumentWithMedia(link.documentId);
      return {
        kind: 'document',
        label: link.label,
        expiresAt: link.expiresAt,
        document,
      };
    }

    if (link.presetId) {
      const preset = await this.repo.findPresetById(link.presetId);
      if (!preset) {
        throw new AppError(404, 'NOT_FOUND', 'Export preset for share link not found.');
      }
      const exportData = await this.repo.buildExportPayload(preset as unknown as ExportPresetRow);
      return {
        kind: 'preset',
        label: link.label,
        expiresAt: link.expiresAt,
        export: exportData,
      };
    }

    throw new AppError(404, 'NOT_FOUND', 'Share link target not found.');
  }
}
