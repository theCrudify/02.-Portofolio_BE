import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import type { ListMediaQueryDto } from './list.dto';
import { ListMediaRepository } from './list.repository';

export class ListMediaService extends BaseService {
  protected override readonly repo: ListMediaRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new ListMediaRepository(db);
  }

  async execute(query: ListMediaQueryDto) {
    return this.repo.list(query);
  }
}
