import { BaseRepository } from '@/core/base';
import { writeAuditLog } from '@/services/content.service';
import {
  createDocument,
  createExportPreset,
  createShareLink,
} from '@/services/document.service';

export class CreateDocumentsRepository extends BaseRepository {
  async insertDocument(values: Parameters<typeof createDocument>[1]) {
    return createDocument(this.db, values);
  }

  async insertPreset(values: Parameters<typeof createExportPreset>[1]) {
    return createExportPreset(this.db, values);
  }

  async insertShareLink(values: Parameters<typeof createShareLink>[1]) {
    return createShareLink(this.db, values);
  }

  async logAudit(entry: Parameters<typeof writeAuditLog>[1]) {
    await writeAuditLog(this.db, entry);
  }
}
