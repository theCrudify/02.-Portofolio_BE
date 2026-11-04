import { BaseRepository } from '@/core/base';
import { writeAuditLog } from '@/services/content.service';
import { findMediaUsages, softDeleteMedia } from '@/services/media.service';

export class DeleteMediaRepository extends BaseRepository {
  async findUsages(id: string) {
    return findMediaUsages(this.db, id);
  }

  async softDelete(id: string) {
    return softDeleteMedia(this.db, id);
  }

  async logAudit(entry: Parameters<typeof writeAuditLog>[1]) {
    await writeAuditLog(this.db, entry);
  }
}
