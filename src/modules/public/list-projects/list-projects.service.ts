import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import type { Locale } from '@/lib/locale';
import type { ListPublicProjectsQueryDto } from './list-projects.dto';
import { ListPublicProjectsRepository } from './list-projects.repository';

export class ListPublicProjectsService extends BaseService {
  protected override readonly repo: ListPublicProjectsRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new ListPublicProjectsRepository(db);
  }

  async execute(locale: Locale, query: ListPublicProjectsQueryDto) {
    return this.repo.list(locale, query);
  }
}
