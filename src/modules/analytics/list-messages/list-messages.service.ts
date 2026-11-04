import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import type { ListMessagesQueryDto } from './list-messages.dto';
import { ListMessagesRepository } from './list-messages.repository';

export class ListMessagesService extends BaseService {
  protected override readonly repo: ListMessagesRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new ListMessagesRepository(db);
  }

  async execute(query: ListMessagesQueryDto) {
    return this.repo.list(query);
  }
}
