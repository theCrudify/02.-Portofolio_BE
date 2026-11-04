import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import { AppError } from '@/lib/errors';
import type { UpdateMessageBodyDto } from './update-message.dto';
import { UpdateMessageRepository } from './update-message.repository';

export class UpdateMessageService extends BaseService {
  protected override readonly repo: UpdateMessageRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new UpdateMessageRepository(db);
  }

  async execute(id: string, dto: UpdateMessageBodyDto) {
    const updated = await this.repo.updateById(id, dto);
    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', 'Message not found');
    }
    return updated;
  }
}
