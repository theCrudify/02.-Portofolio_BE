import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import { SqlQueryBuilder } from '@/core/query';
import type { ResourceConfig } from '@/services/resource-registry';
import type { ListContentQueryDto } from './list.dto';

const SEARCHABLE_KEYS = [
  'name',
  'slug',
  'titleEn',
  'titleId',
  'summaryEn',
  'summaryId',
  'company',
  'roleEn',
  'roleId',
  'institution',
  'degree',
  'issuer',
  'organization',
  'eventName',
  'title',
  'venue',
  'quoteEn',
];

export class ListContentRepository extends BaseRepository {
  async list(config: ResourceConfig, query: Partial<ListContentQueryDto>) {
    const { page, limit, offset } = SqlQueryBuilder.computePagination(query.page, query.limit, 50);

    const conditions = [];
    if (!query.includeDeleted) {
      conditions.push(isNull(config.table.deletedAt));
    }
    if (query.status) {
      conditions.push(eq(config.table.status, query.status));
    }
    if (query.featured !== undefined && 'featured' in config.table) {
      conditions.push(eq(config.table.featured, query.featured));
    }
    if (query.category && 'category' in config.table) {
      conditions.push(eq(config.table.category, query.category));
    }
    if (query.type && 'type' in config.table) {
      conditions.push(eq(config.table.type, query.type));
    }

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
      const allRows = (await this.db
        .select()
        .from(config.table)
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
          filters: {
            status: query.status,
            featured: query.featured,
            category: query.category,
            type: query.type,
          },
        },
        SEARCHABLE_KEYS,
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
      this.db
        .select()
        .from(config.table)
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
