import { lk } from '@/db/queries/lookups';
import { selectWithStatus } from '@/services/content-store';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import { SqlQueryBuilder } from '@/core/query';
import type { ResourceConfig } from '@/services/resource-registry';
import type { ListContentQueryDto } from './list.dto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `?type=` / `?category=` accept a lookup id or a code of the column's lookup group. */
function lookupFilter(config: ResourceConfig, column: string, value: string | undefined) {
  if (!value) return null;
  const group = config.lookupFields?.[column];
  if (!group || !(column in config.table)) return null;
  return eq(config.table[column], UUID.test(value) ? value : lk(group, value));
}

export class ListContentRepository extends BaseRepository {
  async list(config: ResourceConfig, query: Partial<ListContentQueryDto>) {
    const { page, limit, offset } = SqlQueryBuilder.computePagination(query.page, query.limit, 50);

    const conditions = [];
    if (!query.includeDeleted) {
      conditions.push(isNull(config.table.deletedAt));
    }
    if (query.status) {
      conditions.push(eq(config.table.statusId, lk('content_status', query.status)));
    }
    if (query.featured !== undefined && 'featured' in config.table) {
      conditions.push(eq(config.table.featured, query.featured));
    }
    const categoryCond = lookupFilter(config, 'categoryId', query.category);
    if (categoryCond) conditions.push(categoryCond);
    const typeCond = lookupFilter(config, 'typeId', query.type);
    if (typeCond) conditions.push(typeCond);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const hasCustomQuery = Boolean(
      query.search ||
      query.q ||
      query.sortBy ||
      query.sort ||
      query.all ||
      query.featured !== undefined ||
      query.category ||
      query.type,
    );

    if (hasCustomQuery) {
      const allRows = (await selectWithStatus(this.db, config.table)
        .where(whereClause)
        .orderBy(asc(config.table.sortOrder), desc(config.table.createdAt))) as Record<
        string,
        unknown
      >[];

      const refined = SqlQueryBuilder.applyMemoryRefinement(
        allRows,
        {
          page,
          limit,
          search: query.search ?? query.q,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          sort: query.sort,
          all: query.all,
          includeDeleted: query.includeDeleted,
          // status/featured/category/type are already applied in SQL above.
          filters: {},
        },
        config.searchKeys,
      );

      const total = refined.length;
      if (query.all) {
        return {
          data: refined,
          meta: SqlQueryBuilder.buildMeta(1, total || limit, total, true),
        };
      }

      return {
        data: refined.slice(offset, offset + limit),
        meta: SqlQueryBuilder.buildMeta(page, limit, total, false),
      };
    }

    const [rows, total] = await Promise.all([
      selectWithStatus(this.db, config.table)
        .where(whereClause)
        .orderBy(asc(config.table.sortOrder), desc(config.table.createdAt))
        .limit(limit)
        .offset(offset) as Promise<Record<string, unknown>[]>,
      this.db.$count(config.table, whereClause),
    ]);

    return {
      data: rows,
      meta: { page, limit, total },
    };
  }
}
