import { BaseRepository } from '@/core/base';
import { getAdminAnalytics } from '@/services/analytics.service';

export class AnalyticsSummaryRepository extends BaseRepository {
  async getSummary(range: '7d' | '30d' | '90d') {
    return getAdminAnalytics(this.db, range);
  }
}
