import { BaseRepository } from '@/core/base';
import { createContainer } from '@/core/container';
import { SqlQueryBuilder } from '@/core/query';
import type { Locale } from '@/lib/locale';
import type { ListPublicCertificationsQueryDto } from './list-certifications.dto';

export class ListPublicCertificationsRepository extends BaseRepository {
  async list(locale: Locale, query: ListPublicCertificationsQueryDto) {
    const container = createContainer(this.db);
    const items = await container.certificationService.listCertifications({
      locale,
      type: query.type,
    });

    const hasRefinement = Boolean(
      query.search ||
      query.q ||
      query.sortBy ||
      query.sort ||
      query.page ||
      query.limit ||
      query.all
    );

    if (!hasRefinement) {
      return { items, meta: undefined };
    }

    const refined = SqlQueryBuilder.applyMemoryRefinement(
      items as unknown as Record<string, unknown>[],
      { ...query, all: query.all ?? (!query.page && !query.limit) },
      ['name', 'issuer', 'description', 'credentialId'],
      'sortOrder',
      'asc',
    );

    return { items: refined.rows, meta: refined.meta };
  }
}
