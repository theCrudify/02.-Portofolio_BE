import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import { ExportBackupRepository } from './export-backup.repository';

export class ExportBackupService extends BaseService {
  protected override readonly repo: ExportBackupRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new ExportBackupRepository(db);
  }

  async execute() {
    return this.repo.exportAll();
  }
}
