import { BaseRepository } from '@/core/base';
import { exportBackup } from '@/services/system.service';

export class ExportBackupRepository extends BaseRepository {
  async exportAll() {
    return exportBackup(this.db);
  }
}
