import { eq, isNull } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import { SqlQueryBuilder } from '@/core/query';
import { media } from '@/db/schema';
import type { ListMediaQueryDto } from './list.dto';

export class ListMediaRepository extends BaseRepository {
  async list(query: ListMediaQueryDto) {
    const dbKind: 'image' | 'video' | 'pdf' | undefined =
      query.kind === 'document' || query.kind === 'pdf'
        ? 'pdf'
        : query.kind === 'image' || query.kind === 'video'
          ? query.kind
          : undefined;

    const baseWhere = query.includeDeleted ? undefined : isNull(media.deletedAt);

    return SqlQueryBuilder.execute(this.db, {
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
        kind: media.kind,
        titleEn: media.titleEn,
      },
      defaultSortColumn: media.createdAt,
      defaultSortField: 'createdAt',
      defaultSortOrder: 'desc',
      baseWhere,
      filterFn: () => {
        const conds = [];
        if (dbKind) conds.push(eq(media.kind, dbKind));
        if (query.provider) conds.push(eq(media.provider, query.provider as never));
        return conds;
      },
      memoryPredicates: [
        (item) => (query.includeDeleted ? true : !item.deletedAt),
        (item) => (dbKind ? item.kind === dbKind : true),
        (item) => (query.provider ? item.provider === query.provider : true),
      ],
    });
  }
}
