import { BaseRepository } from '@/core/base';
import { recordEvent } from '@/services/analytics.service';

export class RecordEventRepository extends BaseRepository {
  async insertEvent(values: Parameters<typeof recordEvent>[1]) {
    await recordEvent(this.db, values);
  }
}
