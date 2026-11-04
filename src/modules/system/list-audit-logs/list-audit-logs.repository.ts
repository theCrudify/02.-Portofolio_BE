import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import { SqlQueryBuilder } from '@/core/query';
import { auditLogs } from '@/db/schema';
import type { ListAuditLogsQueryDto } from './list-audit-logs.dto';

export class ListAuditLogsRepository extends BaseRepository {
  async list(query: ListAuditLogsQueryDto) {
    return SqlQueryBuilder.execute(this.db, {
      table: auditLogs,
      query: {
        ...query,
        limit: query.limit ?? 50,
      },
      searchColumns: [auditLogs.action, auditLogs.resource, auditLogs.summary],
      searchFields: ['action', 'resource', 'summary', 'resourceId'],
      sortableColumns: {
        createdAt: auditLogs.createdAt,
        action: auditLogs.action,
        resource: auditLogs.resource,
      },
      defaultSortColumn: auditLogs.createdAt,
      defaultSortField: 'createdAt',
      defaultSortOrder: 'desc',
      filterFn: () => {
        const conds = [];
        if (query.action) conds.push(eq(auditLogs.action, query.action as never));
        if (query.resource) conds.push(eq(auditLogs.resource, query.resource));
        if (query.userId) conds.push(eq(auditLogs.userId, query.userId));
        return conds;
      },
      memoryPredicates: [
        (item) => (query.action ? item.action === query.action : true),
        (item) => (query.resource ? item.resource === query.resource : true),
        (item) => (query.userId ? item.userId === query.userId : true),
      ],
    });
  }
}
