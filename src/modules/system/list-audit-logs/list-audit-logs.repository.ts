import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import { SqlQueryBuilder } from '@/core/query';
import { loadLookups } from '@/db/queries/lookups';
import { auditLogs } from '@/db/schema';
import type { ListAuditLogsQueryDto } from './list-audit-logs.dto';

export class ListAuditLogsRepository extends BaseRepository {
  async list(query: ListAuditLogsQueryDto) {
    const lookups = await loadLookups(this.db);
    const actionId = lookups.idOf('audit_action', query.action);
    const result = await SqlQueryBuilder.execute(this.db, {
      table: auditLogs,
      query: {
        ...query,
        limit: query.limit ?? 50,
      },
      searchColumns: [auditLogs.resource, auditLogs.summary],
      searchFields: ['resource', 'summary', 'resourceId'],
      sortableColumns: {
        createdAt: auditLogs.createdAt,
        action: auditLogs.actionId,
        resource: auditLogs.resource,
      },
      defaultSortColumn: auditLogs.createdAt,
      defaultSortField: 'createdAt',
      defaultSortOrder: 'desc',
      filterFn: () => {
        const conds = [];
        if (query.action) conds.push(eq(auditLogs.actionId, actionId ?? ''));
        if (query.resource) conds.push(eq(auditLogs.resource, query.resource));
        if (query.userId) conds.push(eq(auditLogs.userId, query.userId));
        return conds;
      },
      memoryPredicates: [
        (item) => (query.action ? item.actionId === actionId : true),
        (item) => (query.resource ? item.resource === query.resource : true),
        (item) => (query.userId ? item.userId === query.userId : true),
      ],
    });
    const items = result.data.map((log) => ({ ...log, action: lookups.code(log.actionId as string) ?? '' }));
    return { ...result, data: items, rows: items };
  }
}
