import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import { AppError } from '@/lib/errors';
import { DetailMediaRepository } from './detail.repository';

export class DetailMediaService extends BaseService {
  protected override readonly repo: DetailMediaRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new DetailMediaRepository(db);
  }

  async execute(id: string) {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new AppError(404, 'NOT_FOUND', 'Media asset not found');
    }
    return row;
  }
}
