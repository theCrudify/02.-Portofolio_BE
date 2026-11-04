import { BaseRepository } from '@/core/base';
import { writeAuditLog } from '@/services/content.service';
import {
  activateDocument,
  updateExportPreset,
  updateShareLink,
} from '@/services/document.service';

export class UpdateDocumentsRepository extends BaseRepository {
  async activateDocument(id: string) {
    return activateDocument(this.db, id);
  }

  async updatePreset(id: string, values: Parameters<typeof updateExportPreset>[2]) {
    return updateExportPreset(this.db, id, values);
  }

  async updateShareLink(id: string, patch: Parameters<typeof updateShareLink>[2]) {
    return updateShareLink(this.db, id, patch);
  }

  async logAudit(entry: Parameters<typeof writeAuditLog>[1]) {
    await writeAuditLog(this.db, entry);
  }
}
