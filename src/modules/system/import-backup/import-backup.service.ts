import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import { revalidate } from '@/lib/revalidate';
import type { Env } from '@/types/env';
import type { ImportBackupBodyDto } from './import-backup.dto';
import { ImportBackupRepository } from './import-backup.repository';

export class ImportBackupService extends BaseService {
  protected override readonly repo: ImportBackupRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new ImportBackupRepository(db);
  }

  async execute(dto: ImportBackupBodyDto, dryRun: boolean, userId: string, env: Env) {
    const tables = dto.tables;
    const counts: Record<string, number> = {};
    for (const [k, rows] of Object.entries(tables)) {
      counts[k] = Array.isArray(rows) ? rows.length : 0;
    }

    if (dryRun) {
      return { dryRun: true, valid: true, counts };
    }

    const imported = await this.repo.restoreTables(tables);

    await this.repo.logAudit({
      userId,
      action: 'import',
      resource: 'backup',
      summary: 'Imported JSON backup bundle',
    });

    await revalidate(env, ['site', 'projects', 'certifications', 'documents']);
    return { dryRun: false, imported: true, counts, restored: imported };
  }
}
