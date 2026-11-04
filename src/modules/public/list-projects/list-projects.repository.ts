import { BaseRepository } from '@/core/base';
import { createContainer } from '@/core/container';
import { SqlQueryBuilder } from '@/core/query';
import type { Locale } from '@/lib/locale';
import type { ListPublicProjectsQueryDto } from './list-projects.dto';

export class ListPublicProjectsRepository extends BaseRepository {
  async list(locale: Locale, query: ListPublicProjectsQueryDto) {
    const container = createContainer(this.db);
    const hasRefinement = Boolean(
      query.search ||
      query.q ||
      query.sortBy ||
      query.sort ||
      query.featured !== undefined ||
      query.all
    );

    if (!hasRefinement) {
      return container.projectService.listProjects({
        locale,
        technology: query.technology,
        type: query.type,
        page: query.page,
        limit: query.limit,
      });
    }

    const baseResult = await container.projectService.listProjects({
      locale,
      technology: query.technology,
      type: query.type,
      page: 1,
      limit: 100,
    });

    const refined = SqlQueryBuilder.applyMemoryRefinement(
      baseResult.items as unknown as Record<string, unknown>[],
      query,
      ['title', 'summary', 'slug', 'role', 'client'],
      'sortOrder',
      'asc',
      [
        (item) => (query.featured !== undefined ? item.featured === query.featured : true),
      ],
    );

    return {
      items: refined.rows,
      meta: refined.meta,
    };
  }
}
