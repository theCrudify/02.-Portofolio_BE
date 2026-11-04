import { BaseRepository } from '@/core/base';
import { writeAuditLog } from '@/services/audit.service';
import { importBackup } from '@/services/system.service';

export class ImportBackupRepository extends BaseRepository {
  async restoreTables(tables: Parameters<typeof importBackup>[1]) {
    return importBackup(this.db, tables);
  }

  async logAudit(entry: Parameters<typeof writeAuditLog>[1]) {
    await writeAuditLog(this.db, entry);
  }
}
