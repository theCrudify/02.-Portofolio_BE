import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import { SqlQueryBuilder } from '@/core/query';
import { loadLookups } from '@/db/queries/lookups';
import { documents, exportPresets, shareLinks } from '@/db/schema';
import { hydratePresets } from '@/services/document.service';
import type { ListDocumentsQueryDto } from './list.dto';

export class ListDocumentsRepository extends BaseRepository {
  async listDocuments(query: ListDocumentsQueryDto) {
    const lookups = await loadLookups(this.db);
    const typeId = lookups.idOf('document_type', query.type);
    const localeId = lookups.idOf('locale', query.locale);
    const result = await SqlQueryBuilder.execute(this.db, {
      table: documents,
      query,
      searchColumns: [documents.title, documents.notes],
      searchFields: ['title', 'notes'],
      sortableColumns: {
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        title: documents.title,
        version: documents.version,
        type: documents.typeId,
      },
      defaultSortColumn: documents.createdAt,
      defaultSortField: 'createdAt',
      defaultSortOrder: 'desc',
      filterFn: () => {
        const conds = [];
        if (query.type) conds.push(eq(documents.typeId, typeId ?? ''));
        if (query.locale) conds.push(eq(documents.localeId, localeId ?? ''));
        if (query.isActive !== undefined) conds.push(eq(documents.isActive, query.isActive));
        return conds;
      },
      memoryPredicates: [
        (item) => (query.type ? item.typeId === typeId : true),
        (item) => (query.locale ? item.localeId === localeId : true),
        (item) => (query.isActive !== undefined ? item.isActive === query.isActive : true),
      ],
    });
    const items = result.data.map((d) => ({
      ...d,
      type: lookups.code(d.typeId as string) ?? '',
      locale: lookups.code(d.localeId as string) ?? '',
    }));
    return { ...result, data: items, rows: items };
  }

  async listPresets(query: ListDocumentsQueryDto) {
    const lookups = await loadLookups(this.db);
    const localeId = lookups.idOf('locale', query.locale);
    const templateId = lookups.idOf('export_template', query.template);
    const result = await SqlQueryBuilder.execute<typeof exportPresets.$inferSelect>(this.db, {
      table: exportPresets,
      query,
      searchColumns: [exportPresets.name, exportPresets.slug],
      searchFields: ['name', 'slug'],
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
        if (query.locale) conds.push(eq(exportPresets.localeId, localeId ?? ''));
        if (query.isPublic !== undefined) conds.push(eq(exportPresets.isPublic, query.isPublic));
        return conds;
      },
      memoryPredicates: [
        (item) => (query.locale ? item.localeId === localeId : true),
        (item) => (query.isPublic !== undefined ? item.isPublic === query.isPublic : true),
        (item) => (query.template ? item.templateId === templateId : true),
      ],
    });
    const items = await hydratePresets(this.db, result.data);
    return { ...result, data: items, rows: items };
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
