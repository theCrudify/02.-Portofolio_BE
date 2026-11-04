import { BaseRepository } from '@/core/base';
import { writeAuditLog } from '@/services/audit.service';
import {
  deleteDocument,
  deleteExportPreset,
  deleteShareLink,
} from '@/services/document.service';

export class DeleteDocumentsRepository extends BaseRepository {
  async deleteDocument(id: string) {
    return deleteDocument(this.db, id);
  }

  async deletePreset(id: string) {
    return deleteExportPreset(this.db, id);
  }

  async deleteShareLink(id: string) {
    return deleteShareLink(this.db, id);
  }

  async logAudit(entry: Parameters<typeof writeAuditLog>[1]) {
    await writeAuditLog(this.db, entry);
  }
}
