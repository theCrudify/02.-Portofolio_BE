import { BaseRepository } from '@/core/base';
import { createContainer } from '@/core/container';
import type { Locale } from '@/lib/locale';

export class DetailPublicProjectRepository extends BaseRepository {
  async findBySlug(slug: string, locale: Locale) {
    const container = createContainer(this.db);
    return container.projectService.getProjectBySlug(slug, locale);
  }
}
