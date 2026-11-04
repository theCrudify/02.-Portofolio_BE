import { eq, inArray, isNull } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import { SqlQueryBuilder } from '@/core/query';
import { loadLookups } from '@/db/queries/lookups';
import { media } from '@/db/schema';
import type { ListMediaQueryDto } from './list.dto';

export class ListMediaRepository extends BaseRepository {
  async list(query: ListMediaQueryDto) {
    const lookups = await loadLookups(this.db);
    // `kind` accepts several codes, e.g. "pdf,document" for every document-like file.
    const kindIds = (query.kind ?? '')
      .split(',')
      .filter(Boolean)
      .map((code) => lookups.idOf('media_kind', code.trim()) ?? '');
    const providerId = lookups.idOf('media_provider', query.provider);

    const baseWhere = query.includeDeleted ? undefined : isNull(media.deletedAt);

    const result = await SqlQueryBuilder.execute(this.db, {
      table: media,
      query: {
        ...query,
        limit: query.limit ?? 50,
      },
      searchColumns: [media.titleEn, media.titleId, media.altEn, media.altId, media.publicId, media.url],
      searchFields: ['titleEn', 'titleId', 'altEn', 'altId', 'publicId', 'url'],
      sortableColumns: {
        createdAt: media.createdAt,
        updatedAt: media.updatedAt,
        bytes: media.bytes,
        kind: media.kindId,
        titleEn: media.titleEn,
      },
      defaultSortColumn: media.createdAt,
      defaultSortField: 'createdAt',
      defaultSortOrder: 'desc',
      baseWhere,
      filterFn: () => {
        const conds = [];
        if (kindIds.length) conds.push(inArray(media.kindId, kindIds));
        if (query.provider) conds.push(eq(media.providerId, providerId ?? ''));
        return conds;
      },
      memoryPredicates: [
        (item) => (query.includeDeleted ? true : !item.deletedAt),
        (item) => (kindIds.length ? kindIds.includes(String(item.kindId)) : true),
        (item) => (query.provider ? item.providerId === providerId : true),
      ],
    });
    // Admin clients work with codes; ids stay on the row for references.
    const items = result.data.map((m) => ({
      ...m,
      kind: lookups.code(m.kindId as string) ?? '',
      provider: lookups.code(m.providerId as string) ?? '',
    }));
    return { ...result, data: items, rows: items };
  }
}
