import { BaseRepository } from '@/core/base';
import { saveContactMessage } from '@/services/analytics.service';

export class SubmitContactRepository extends BaseRepository {
  async insertMessage(values: Parameters<typeof saveContactMessage>[1]) {
    return saveContactMessage(this.db, values);
  }
}
