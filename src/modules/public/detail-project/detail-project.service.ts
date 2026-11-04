import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import type { Locale } from '@/lib/locale';
import { DetailPublicProjectRepository } from './detail-project.repository';

export class DetailPublicProjectService extends BaseService {
  protected override readonly repo: DetailPublicProjectRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new DetailPublicProjectRepository(db);
  }

  async execute(slug: string, locale: Locale) {
    return this.repo.findBySlug(slug, locale);
  }
}
