import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import type { Locale } from '@/lib/locale';
import { GetSiteRepository } from './site.repository';

export class GetSiteService extends BaseService {
  protected override readonly repo: GetSiteRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new GetSiteRepository(db);
  }

  async execute(locale: Locale) {
    return this.repo.fetchSite(locale);
  }
}
