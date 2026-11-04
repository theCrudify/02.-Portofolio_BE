import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import type { AnalyticsSummaryQueryDto } from './summary.dto';
import { AnalyticsSummaryRepository } from './summary.repository';

export class AnalyticsSummaryService extends BaseService {
  protected override readonly repo: AnalyticsSummaryRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new AnalyticsSummaryRepository(db);
  }

  async execute(query: AnalyticsSummaryQueryDto) {
    const range =
      query.range === '7d' || query.range === '30d' || query.range === '90d'
        ? query.range
        : '30d';
    return this.repo.getSummary(range);
  }
}
