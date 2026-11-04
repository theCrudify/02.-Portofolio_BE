import { BaseRepository } from '@/core/base';
import {
  getActiveDocument,
  getDocumentWithMedia,
  getPresetById,
  getPresetBySlug,
  getShareLinkByToken,
  recordShareOpen,
} from '@/services/document.service';
import { buildExport, buildJsonResume, type ExportPresetRow } from '@/services/export.service';

export class ExportDocumentsRepository extends BaseRepository {
  async findActiveDocument(type: 'cv' | 'portfolio_pdf' | 'other', locale: 'en' | 'id') {
    return getActiveDocument(this.db, type, locale);
  }

  async buildResume(locale: 'en' | 'id') {
    return buildJsonResume(this.db, locale);
  }

  async findPresetBySlug(slug: string) {
    return getPresetBySlug(this.db, slug);
  }

  async findPresetById(id: string) {
    return getPresetById(this.db, id);
  }

  async buildExportPayload(preset: ExportPresetRow, localeOverride?: 'en' | 'id') {
    return buildExport(this.db, preset, localeOverride);
  }

  async findShareLinkByToken(token: string) {
    return getShareLinkByToken(this.db, token);
  }

  async recordShareLinkOpen(linkId: string, token: string, vHash: string) {
    return recordShareOpen(this.db, linkId, token, vHash);
  }

  async findDocumentWithMedia(id: string) {
    return getDocumentWithMedia(this.db, id);
  }
}
