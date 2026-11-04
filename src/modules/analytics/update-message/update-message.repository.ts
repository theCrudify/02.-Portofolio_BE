import { BaseRepository } from '@/core/base';
import { updateAdminMessage } from '@/services/analytics.service';
import type { UpdateMessageBodyDto } from './update-message.dto';

export class UpdateMessageRepository extends BaseRepository {
  async updateById(id: string, patch: UpdateMessageBodyDto) {
    return updateAdminMessage(this.db, id, patch);
  }
}
