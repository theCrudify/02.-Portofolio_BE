import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import type { ListAuditLogsQueryDto } from './list-audit-logs.dto';
import { ListAuditLogsRepository } from './list-audit-logs.repository';

export class ListAuditLogsService extends BaseService {
  protected override readonly repo: ListAuditLogsRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new ListAuditLogsRepository(db);
  }

  async execute(query: ListAuditLogsQueryDto) {
    return this.repo.list(query);
  }
}
