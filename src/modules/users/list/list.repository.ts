import { BaseRepository } from '@/core/base';
import { SqlQueryBuilder } from '@/core/query';
import * as schema from '@/db/schema';
import type { ListUsersQueryDto } from './list.dto';

export class ListUsersRepository extends BaseRepository {
  async findUsers(query: Partial<ListUsersQueryDto> = {}) {
    const allRows = await this.db.select().from(schema.users);
    const refined = SqlQueryBuilder.applyMemoryRefinement(
      allRows as unknown as Record<string, unknown>[],
      {
        page: query.page,
        limit: query.limit,
        search: query.search ?? query.q,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        sort: query.sort,
        all: query.all,
        filters: {
          role: query.role,
          isActive: query.isActive,
          totpEnabled: query.totpEnabled,
        },
      },
      ['name', 'email', 'role'],
    ) as unknown as (typeof schema.users.$inferSelect)[];

    const total = refined.length;
    if (query.all || (!query.page && !query.limit)) {
      return {
        rows: refined,
        meta: SqlQueryBuilder.buildMeta(1, total || 50, total, Boolean(query.all)),
      };
    }

    const { page, limit, offset } = SqlQueryBuilder.computePagination(query.page, query.limit, 50);
    return {
      rows: refined.slice(offset, offset + limit),
      meta: SqlQueryBuilder.buildMeta(page, limit, total, false),
    };
  }
}
