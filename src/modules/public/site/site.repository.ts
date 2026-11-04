import { BaseRepository } from '@/core/base';
import { createContainer } from '@/core/container';
import type { Locale } from '@/lib/locale';

export class GetSiteRepository extends BaseRepository {
  async fetchSite(locale: Locale) {
    const container = createContainer(this.db);
    return container.siteService.getSite(locale);
  }
}
