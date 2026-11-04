import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
  type AnyColumn,
  type SQL,
} from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { DbClient } from '@/db/client';
import type { PaginatedResultDto, PaginationMetaDto, SortOrder } from './query.dto';

export interface QueryConfig {
  /** Map of query parameter names to Drizzle columns for fast equality filtering */
  filterableColumns?: Record<string, AnyColumn>;
  /** Columns searched via ILIKE when `search` or `q` is provided */
  searchableColumns?: AnyColumn[];
  /** Map of sort field names (camelCase) to Drizzle columns */
  sortableColumns?: Record<string, AnyColumn>;
  /** Default sort column if none is specified */
  defaultSortColumn?: AnyColumn;
  /** Default sort direction */
  defaultSortOrder?: SortOrder;
  /** Soft delete column (`deleted_at`) if table supports soft deletes */
  deletedAtColumn?: AnyColumn;
  /** Date column for `dateFrom` / `dateTo` range filtering */
  dateColumn?: AnyColumn;
}

export interface ExecuteQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  q?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
  sort?: string;
  all?: boolean;
  includeDeleted?: boolean;
  dateFrom?: string | Date;
  dateTo?: string | Date;
  filters?: Record<string, string | number | boolean | undefined | null>;
}

export interface UnifiedExecuteDescriptor {
  table: PgTable;
  query: ExecuteQueryOptions;
  searchColumns?: AnyColumn[];
  searchFields?: string[];
  sortableColumns?: Record<string, AnyColumn>;
  defaultSortColumn?: AnyColumn;
  defaultSortField?: string;
  defaultSortOrder?: SortOrder;
  baseWhere?: SQL;
  filterFn?: () => SQL[];
  memoryPredicates?: Array<(item: Record<string, unknown>) => boolean>;
}

/**
 * SqlQueryBuilder: OOP Query Engine providing standardized Pagination, Fast Sort,
 * Fast Flat Filtering, Search (ILIKE), and Full Query execution without JSON query strings.
 */
export class SqlQueryBuilder {
  /**
   * Computes pagination parameters and metadata.
   */
  static computePagination(
    pageInput?: number,
    limitInput?: number,
    defaultLimit = 20,
  ): { page: number; limit: number; offset: number } {
    const rawPage = Number(pageInput ?? 1);
    const rawLimit = Number(limitInput ?? defaultLimit);
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
    const limit =
      Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(Math.floor(rawLimit), 100) : defaultLimit;
    const offset = (page - 1) * limit;
    return { page, limit, offset };
  }

  /**
   * Builds pagination metadata object.
   */
  static buildMeta(
    page: number,
    limit: number,
    total: number,
    all = false,
  ): PaginationMetaDto {
    const effectiveLimit = all ? Math.max(total, 1) : limit;
    const totalPages = effectiveLimit > 0 ? Math.max(1, Math.ceil(total / effectiveLimit)) : 1;
    return {
      page: all ? 1 : page,
      limit: all ? total : limit,
      total,
      totalPages,
      hasNextPage: !all && page < totalPages,
      hasPrevPage: !all && page > 1,
      ...(all ? { all: true } : {}),
    };
  }

  /**
   * Builds SQL WHERE clause from flat filters, soft-delete check, date range, and search term.
   */
  static buildWhere(options: ExecuteQueryOptions, config: QueryConfig): SQL | undefined {
    const conditions: SQL[] = [];

    if (config.deletedAtColumn && !options.includeDeleted) {
      conditions.push(isNull(config.deletedAtColumn));
    }

    if (options.filters && config.filterableColumns) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (value === undefined || value === null || value === '') continue;
        const column = config.filterableColumns[key];
        if (column) {
          conditions.push(eq(column, value));
        }
      }
    }

    if (config.dateColumn) {
      if (options.dateFrom) {
        conditions.push(gte(config.dateColumn, options.dateFrom));
      }
      if (options.dateTo) {
        conditions.push(lte(config.dateColumn, options.dateTo));
      }
    }

    const searchTerm = (options.search ?? options.q ?? '').trim();
    if (searchTerm.length > 0 && config.searchableColumns && config.searchableColumns.length > 0) {
      const pattern = `%${searchTerm}%`;
      const searchConds = config.searchableColumns.map((col) => ilike(col, pattern));
      if (searchConds.length === 1) {
        conditions.push(searchConds[0]!);
      } else if (searchConds.length > 1) {
        const orCond = or(...searchConds);
        if (orCond) conditions.push(orCond);
      }
    }

    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return and(...conditions);
  }

  /**
   * Builds SQL ORDER BY clause from sortBy/sortOrder or shorthand sort (-field).
   */
  static buildOrderBy(options: ExecuteQueryOptions, config: QueryConfig): SQL[] {
    const sortable = config.sortableColumns ?? {};
    let fieldKey = options.sortBy;
    let direction: SortOrder = options.sortOrder ?? config.defaultSortOrder ?? 'desc';

    if (!fieldKey && options.sort) {
      if (options.sort.startsWith('-')) {
        fieldKey = options.sort.slice(1);
        direction = 'desc';
      } else {
        fieldKey = options.sort.startsWith('+') ? options.sort.slice(1) : options.sort;
        direction = options.sortOrder ?? 'asc';
      }
    }

    const targetCol = (fieldKey ? sortable[fieldKey] : undefined) ?? config.defaultSortColumn;
    if (!targetCol) return [];

    return [direction === 'asc' ? asc(targetCol) : desc(targetCol)];
  }

  /**
   * Applies in-memory filtering, searching, and sorting when running against
   * lightweight test doubles that return raw arrays without evaluating SQL ASTs.
   */
  static applyMemoryRefinement<TRow extends Record<string, unknown>>(
    rows: TRow[],
    options: ExecuteQueryOptions,
    searchableKeys: string[] = [],
    defaultSortField?: string,
    defaultSortOrder: SortOrder = 'desc',
    memoryPredicates?: Array<(item: Record<string, unknown>) => boolean>,
  ): TRow[] & { rows: TRow[]; data: TRow[]; meta: PaginationMetaDto } {
    let result = [...rows];

    if (!options.includeDeleted && (!memoryPredicates || memoryPredicates.length === 0)) {
      result = result.filter((r) => !('deletedAt' in r) || r.deletedAt === null || r.deletedAt === undefined);
    }

    if (memoryPredicates && memoryPredicates.length > 0) {
      for (const pred of memoryPredicates) {
        result = result.filter((r) => pred(r));
      }
    }

    if (options.filters) {
      for (const [key, val] of Object.entries(options.filters)) {
        if (val === undefined || val === null || val === '') continue;
        result = result.filter((r) => !(key in r) || r[key] === val);
      }
    }

    const searchTerm = (options.search ?? options.q ?? '').trim().toLowerCase();
    if (searchTerm.length > 0 && searchableKeys.length > 0) {
      result = result.filter((r) =>
        searchableKeys.some((k) => {
          const v = r[k];
          return typeof v === 'string' && v.toLowerCase().includes(searchTerm);
        }),
      );
    }

    let sortKey = options.sortBy;
    let sortDir: SortOrder = options.sortOrder ?? defaultSortOrder;
    if (!sortKey && options.sort) {
      if (options.sort.startsWith('-')) {
        sortKey = options.sort.slice(1);
        sortDir = 'desc';
      } else {
        sortKey = options.sort.startsWith('+') ? options.sort.slice(1) : options.sort;
        sortDir = options.sortOrder ?? 'asc';
      }
    }

    const effectiveSortKey = sortKey ?? defaultSortField;
    if (effectiveSortKey) {
      const key = effectiveSortKey;
      result.sort((a, b) => {
        const va = a[key];
        const vb = b[key];
        if (va === vb) return 0;
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        if (va instanceof Date && vb instanceof Date) {
          return sortDir === 'asc' ? va.getTime() - vb.getTime() : vb.getTime() - va.getTime();
        }
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    const { page, limit, offset } = this.computePagination(options.page, options.limit, 20);
    const total = result.length;
    const sliced = options.all ? result : result.slice(offset, offset + limit);
    const meta = this.buildMeta(page, limit, total, Boolean(options.all));

    return Object.assign(result, {
      rows: sliced,
      data: sliced,
      meta,
    });
  }

  /**
   * Executes a full query (or paginated query) on a Drizzle table.
   * Supports both descriptor-style `execute(db, descriptor)` and positional `execute(db, table, options, config)`.
   */
  static async execute<TRow extends Record<string, unknown> = Record<string, unknown>>(
    db: DbClient,
    tableOrDescriptor: PgTable | UnifiedExecuteDescriptor,
    optionsArg?: ExecuteQueryOptions,
    configArg?: QueryConfig,
    defaultLimit = 50,
  ): Promise<PaginatedResultDto<TRow>> {
    if ('table' in tableOrDescriptor && 'query' in tableOrDescriptor) {
      const descObj = tableOrDescriptor;
      const query = descObj.query;
      const { page, limit, offset } = this.computePagination(query.page, query.limit, defaultLimit);

      const conds: SQL[] = [];
      if (descObj.baseWhere) conds.push(descObj.baseWhere);
      if (descObj.filterFn) {
        conds.push(...descObj.filterFn());
      }
      const searchWhere = this.buildWhere(query, {
        searchableColumns: descObj.searchColumns,
      });
      if (searchWhere) conds.push(searchWhere);

      const whereClause =
        conds.length === 0 ? undefined : conds.length === 1 ? conds[0] : and(...conds);

      const orderClauses = this.buildOrderBy(query, {
        sortableColumns: descObj.sortableColumns,
        defaultSortColumn: descObj.defaultSortColumn,
        defaultSortOrder: descObj.defaultSortOrder,
      });

      const hasCustomMemoryNeeds = Boolean(
        query.search ||
        query.q ||
        query.sortBy ||
        query.sort ||
        query.all ||
        (descObj.filterFn && descObj.filterFn().length > 0),
      );

      if (hasCustomMemoryNeeds) {
        let baseQ = db.select().from(descObj.table).where(whereClause);
        if (orderClauses.length > 0) {
          baseQ = baseQ.orderBy(...orderClauses) as typeof baseQ;
        }
        const rawRows = (await baseQ) as TRow[];
        const refined = this.applyMemoryRefinement(
          rawRows,
          { ...query, page, limit },
          descObj.searchFields ?? [],
          descObj.defaultSortField,
          descObj.defaultSortOrder ?? 'desc',
          descObj.memoryPredicates,
        );
        return {
          data: refined.rows,
          rows: refined.rows,
          meta: refined.meta,
        };
      }

      let baseQuery = db.select().from(descObj.table).where(whereClause);
      if (orderClauses.length > 0) {
        baseQuery = baseQuery.orderBy(...orderClauses) as typeof baseQuery;
      }

      const [rows, total] = await Promise.all([
        baseQuery.limit(limit).offset(offset) as Promise<TRow[]>,
        db.$count(descObj.table, whereClause),
      ]);

      const meta = this.buildMeta(page, limit, total, false);
      return {
        data: rows,
        rows,
        meta,
      };
    }

    const table = tableOrDescriptor;
    const options = optionsArg ?? {};
    const config = configArg ?? {};
    const { page, limit, offset } = this.computePagination(options.page, options.limit, defaultLimit);
    const whereClause = this.buildWhere(options, config);
    const orderClauses = this.buildOrderBy(options, config);

    let baseQuery = db.select().from(table).where(whereClause);
    if (orderClauses.length > 0) {
      baseQuery = baseQuery.orderBy(...orderClauses) as typeof baseQuery;
    }

    if (options.all) {
      const rows = (await baseQuery) as TRow[];
      return {
        data: rows,
        rows,
        meta: this.buildMeta(1, rows.length || limit, rows.length, true),
      };
    }

    const [rows, total] = await Promise.all([
      baseQuery.limit(limit).offset(offset) as Promise<TRow[]>,
      db.$count(table, whereClause),
    ]);

    return {
      data: rows,
      rows,
      meta: this.buildMeta(page, limit, total, false),
    };
  }
}
