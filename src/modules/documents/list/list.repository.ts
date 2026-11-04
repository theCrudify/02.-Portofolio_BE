import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import { SqlQueryBuilder } from '@/core/query';
import { documents, exportPresets, shareLinks } from '@/db/schema';
import type { ListDocumentsQueryDto } from './list.dto';

export class ListDocumentsRepository extends BaseRepository {
  async listDocuments(query: ListDocumentsQueryDto) {
    return SqlQueryBuilder.execute(this.db, {
      table: documents,
      query,
      searchColumns: [documents.title, documents.notes, documents.type, documents.locale],
      searchFields: ['title', 'notes', 'type', 'locale'],
      sortableColumns: {
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        title: documents.title,
        version: documents.version,
        type: documents.type,
      },
      defaultSortColumn: documents.createdAt,
      defaultSortField: 'createdAt',
      defaultSortOrder: 'desc',
      filterFn: () => {
        const conds = [];
        if (query.type) conds.push(eq(documents.type, query.type));
        if (query.locale) conds.push(eq(documents.locale, query.locale));
        if (query.isActive !== undefined) conds.push(eq(documents.isActive, query.isActive));
        return conds;
      },
      memoryPredicates: [
        (item) => (query.type ? item.type === query.type : true),
        (item) => (query.locale ? item.locale === query.locale : true),
        (item) => (query.isActive !== undefined ? item.isActive === query.isActive : true),
      ],
    });
  }

  async listPresets(query: ListDocumentsQueryDto) {
    return SqlQueryBuilder.execute(this.db, {
      table: exportPresets,
      query,
      searchColumns: [exportPresets.name, exportPresets.slug, exportPresets.template],
      searchFields: ['name', 'slug', 'template'],
      sortableColumns: {
        createdAt: exportPresets.createdAt,
        updatedAt: exportPresets.updatedAt,
        sortOrder: exportPresets.sortOrder,
        name: exportPresets.name,
        slug: exportPresets.slug,
      },
      defaultSortColumn: exportPresets.createdAt,
      defaultSortField: 'createdAt',
      defaultSortOrder: 'desc',
      filterFn: () => {
        const conds = [];
        if (query.locale) conds.push(eq(exportPresets.locale, query.locale));
        if (query.isPublic !== undefined) conds.push(eq(exportPresets.isPublic, query.isPublic));
        return conds;
      },
      memoryPredicates: [
        (item) => (query.locale ? item.locale === query.locale : true),
        (item) => (query.isPublic !== undefined ? item.isPublic === query.isPublic : true),
        (item) => (query.template ? item.template === query.template : true),
      ],
    });
  }

  async listShareLinks(query: ListDocumentsQueryDto) {
    return SqlQueryBuilder.execute(this.db, {
      table: shareLinks,
      query,
      searchColumns: [shareLinks.label, shareLinks.token],
      searchFields: ['label', 'token'],
      sortableColumns: {
        createdAt: shareLinks.createdAt,
        updatedAt: shareLinks.updatedAt,
        viewCount: shareLinks.viewCount,
        label: shareLinks.label,
      },
      defaultSortColumn: shareLinks.createdAt,
      defaultSortField: 'createdAt',
      defaultSortOrder: 'desc',
      filterFn: () => {
        const conds = [];
        if (query.isActive !== undefined) conds.push(eq(shareLinks.isActive, query.isActive));
        return conds;
      },
      memoryPredicates: [
        (item) => (query.isActive !== undefined ? item.isActive === query.isActive : true),
      ],
    });
  }
}
