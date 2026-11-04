import { lookupId } from '@/db/queries/lookups';
import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import { SqlQueryBuilder } from '@/core/query';
import { messages } from '@/db/schema';
import type { ListMessagesQueryDto } from './list-messages.dto';

export class ListMessagesRepository extends BaseRepository {
  async list(query: ListMessagesQueryDto) {
    const localeId = await lookupId(this.db, 'locale', query.locale);
    return SqlQueryBuilder.execute(this.db, {
      table: messages,
      query: {
        ...query,
        limit: query.limit ?? 50,
      },
      searchColumns: [messages.name, messages.email, messages.subject, messages.body],
      searchFields: ['name', 'email', 'subject', 'body'],
      sortableColumns: {
        createdAt: messages.createdAt,
        name: messages.name,
        email: messages.email,
        isRead: messages.isRead,
        isArchived: messages.isArchived,
      },
      defaultSortColumn: messages.createdAt,
      defaultSortField: 'createdAt',
      defaultSortOrder: 'desc',
      filterFn: () => {
        const conds = [];
        if (query.isRead !== undefined) conds.push(eq(messages.isRead, query.isRead));
        if (query.isArchived !== undefined) conds.push(eq(messages.isArchived, query.isArchived));
        if (query.locale) conds.push(eq(messages.localeId, localeId ?? ''));
        return conds;
      },
      memoryPredicates: [
        (item) => (query.isRead !== undefined ? item.isRead === query.isRead : true),
        (item) => (query.isArchived !== undefined ? item.isArchived === query.isArchived : true),
        (item) => (query.locale ? item.localeId === localeId : true),
      ],
    });
  }
}
