import { asc, eq, getTableColumns, sql, type SQL } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { Database } from '@/db/client';
import { lk, loadLookups, type LookupGroupCode, type LookupIndex } from '@/db/queries/lookups';
import { badRequest } from '@/lib/errors';
import type { ChildSpec, ResourceConfig } from './resource-registry';

/**
 * Generic persistence for admin content resources: status as a lookup code, lookup-group
 * validation, and child collections written atomically with their parent.
 */

export type ContentStatus = 'draft' | 'published' | 'archived';
type Row = Record<string, unknown>;
// The registry's tables are typed per resource; the generic path only uses shared columns.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any;

/** Rows of a content table with `status` (the content_status code) alongside the columns. */
export function selectWithStatus(db: Database, table: AnyTable) {
  return db
    .select({
      ...getTableColumns(table as PgTable),
      // Inner columns are qualified: Drizzle renders them bare inside a select list.
      status: sql<ContentStatus>`(select "lookups"."code" from "lookups" where "lookups"."id" = ${table.statusId})`,
    })
    .from(table as PgTable);
}

export async function findItem(db: Database, config: ResourceConfig, id: string): Promise<Row | null> {
  const rows = (await selectWithStatus(db, config.table).where(eq(config.table.id, id)).limit(1)) as Row[];
  return rows[0] ?? null;
}

/** Parent row plus every child collection, shaped like the admin payload. */
export async function readItem(db: Database, config: ResourceConfig, id: string): Promise<Row | null> {
  const row = await findItem(db, config, id);
  if (!row) return null;
  const children = await Promise.all(
    (config.children ?? []).map(async (child) => {
      const t = child.table as AnyTable;
      const query = db.select().from(child.table).where(eq(t[child.parentKey], id));
      const items = (await (child.sorted ? query.orderBy(asc(t.sortOrder)) : query)) as Row[];
      return [child.key, items.map((item) => pick(item, child.fields))] as const;
    }),
  );
  return { ...row, ...Object.fromEntries(children) };
}

function pick(item: Row, fields: string[]): Row {
  return Object.fromEntries(fields.map((f) => [f, item[f] ?? null]));
}

/** Split a validated payload into parent columns and child collections. */
function splitPayload(config: ResourceConfig, payload: Row) {
  const childKeys = new Set((config.children ?? []).map((c) => c.key));
  const parent: Row = {};
  const children: Record<string, Row[]> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (childKeys.has(key)) children[key] = (value as Row[] | undefined) ?? [];
    else parent[key] = value;
  }
  return { parent, children };
}

/** Every lookup id in the payload must belong to the group its column expects. */
export function assertLookupGroups(index: LookupIndex, config: ResourceConfig, payload: Row): void {
  const problems: { path: string; message: string }[] = [];
  const check = (path: string, value: unknown, group: LookupGroupCode) => {
    if (value === null || value === undefined) return;
    const row = index.get(String(value));
    if (!row || row.groupCode !== group) {
      problems.push({ path, message: `Not a ${group} value` });
    }
  };
  for (const [field, group] of Object.entries(config.lookupFields ?? {})) {
    check(field, payload[field], group);
  }
  for (const child of config.children ?? []) {
    const items = payload[child.key];
    if (!Array.isArray(items)) continue;
    items.forEach((item: Row, i) => {
      for (const [field, group] of Object.entries(child.lookupFields ?? {})) {
        check(`${child.key}.${i}.${field}`, item[field], group);
      }
    });
  }
  if (problems.length > 0) {
    throw badRequest('Invalid master-data reference', 'VALIDATION_ERROR', problems);
  }
}

export function childStatements(
  db: Database,
  spec: ChildSpec,
  parentId: string,
  items: Row[],
): BatchItem<'pg'>[] {
  const t = spec.table as AnyTable;
  const statements: BatchItem<'pg'>[] = [db.delete(spec.table).where(eq(t[spec.parentKey], parentId))];
  if (items.length > 0) {
    statements.push(
      db.insert(spec.table).values(
        items.map((item, i) => ({
          ...pick(item, spec.fields),
          [spec.parentKey]: parentId,
          ...(spec.sorted ? { sortOrder: i } : {}),
        })),
      ),
    );
  }
  return statements;
}

export async function runBatch(db: Database, statements: BatchItem<'pg'>[]): Promise<void> {
  if (statements.length === 0) return;
  await db.batch(statements as [BatchItem<'pg'>, ...BatchItem<'pg'>[]]);
}

export async function createItem(db: Database, config: ResourceConfig, payload: Row): Promise<Row> {
  assertLookupGroups(await loadLookups(db), config, payload);
  const { parent, children } = splitPayload(config, payload);
  const [created] = (await db
    .insert(config.table)
    .values({ ...parent, statusId: lk('content_status', 'draft'), publishedAt: null })
    .returning()) as Row[];
  const id = String(created!.id);
  await runBatch(
    db,
    (config.children ?? [])
      .filter((spec) => spec.key in children)
      .flatMap((spec) => childStatements(db, spec, id, children[spec.key]!)),
  );
  return (await readItem(db, config, id))!;
}

/** Updates the given parent columns and replaces each child collection present in the payload. */
export async function updateItem(
  db: Database,
  config: ResourceConfig,
  id: string,
  payload: Row,
): Promise<Row> {
  assertLookupGroups(await loadLookups(db), config, payload);
  const { parent, children } = splitPayload(config, payload);
  const statements: BatchItem<'pg'>[] = [
    db
      .update(config.table)
      .set({ ...parent, updatedAt: new Date() })
      .where(eq(config.table.id, id)),
    ...(config.children ?? [])
      .filter((spec) => spec.key in children)
      .flatMap((spec) => childStatements(db, spec, id, children[spec.key]!)),
  ];
  await runBatch(db, statements);
  return (await readItem(db, config, id))!;
}

export async function setStatus(
  db: Database,
  config: ResourceConfig,
  id: string,
  status: ContentStatus,
  publishedAt: unknown,
): Promise<Row> {
  await db
    .update(config.table)
    .set({ statusId: lk('content_status', status) as SQL, publishedAt, updatedAt: new Date() })
    .where(eq(config.table.id, id));
  return (await findItem(db, config, id))!;
}
