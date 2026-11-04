import { and, asc, desc, eq, isNull, type AnyColumn, type SQL } from 'drizzle-orm';

export interface ContentStatusTable {
  status: AnyColumn;
  deletedAt: AnyColumn;
}

export function publishedOnly(table: ContentStatusTable): SQL {
  return and(eq(table.status, 'published'), isNull(table.deletedAt)) as SQL;
}

export interface PaginateInput {
  page?: number;
  limit?: number;
}

export interface PaginateResult {
  page: number;
  limit: number;
  offset: number;
}

export function paginate(input: PaginateInput = {}): PaginateResult {
  const rawPage = Number(input.page ?? 1);
  const rawLimit = Number(input.limit ?? 20);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(Math.floor(rawLimit), 100) : 20;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function parseSort(
  sortInput: string | undefined,
  allowed: Record<string, AnyColumn>,
  fallbackColumn: AnyColumn,
  fallbackDirection: 'asc' | 'desc' = 'asc',
): SQL {
  if (!sortInput) {
    return fallbackDirection === 'desc' ? desc(fallbackColumn) : asc(fallbackColumn);
  }

  const isDesc = sortInput.startsWith('-');
  const key = isDesc ? sortInput.slice(1) : sortInput;
  const col = allowed[key];

  if (!col) {
    return fallbackDirection === 'desc' ? desc(fallbackColumn) : asc(fallbackColumn);
  }

  return isDesc ? desc(col) : asc(col);
}
