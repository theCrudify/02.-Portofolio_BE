import { badRequest } from '@/lib/errors';
import { asc, eq, sql, type SQL } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { lookupGroups, lookups } from '@/db/schema';

/** Lookup groups whose codes the application refers to. Values live in the database. */
export type LookupGroupCode =
  | 'user_role'
  | 'content_status'
  | 'audit_action'
  | 'event_type'
  | 'locale'
  | 'media_provider'
  | 'media_kind'
  | 'document_type'
  | 'hero_cv_buttons'
  | 'export_template'
  | 'site_section'
  | 'theme_preset'
  | 'color_mode'
  | 'font_pair'
  | 'project_media_role'
  | 'project_type'
  | 'project_state'
  | 'tech_category'
  | 'tech_group'
  | 'link_type'
  | 'employment_type'
  | 'work_mode'
  | 'availability'
  | 'cert_type'
  | 'activity_type'
  | 'publication_type'
  | 'organization_type'
  | 'social_platform'
  | 'language_level';

/**
 * Scalar subquery resolving (group, code) to a lookup id, usable in inserts, updates and filters
 * without loading lookups first. Yields NULL for an unknown code, so NOT NULL columns reject it.
 */
export function lk(group: LookupGroupCode, code: string): SQL<string> {
  // Fully qualified on purpose: Drizzle drops table prefixes when this sits in a select list,
  // and both tables have "id" and "code".
  return sql<string>`(select "lookups"."id" from "lookups" inner join "lookup_groups" on "lookup_groups"."id" = "lookups"."group_id" where "lookup_groups"."code" = ${group} and "lookups"."code" = ${code})`;
}

export interface LookupRow {
  id: string;
  groupCode: string;
  code: string;
  labelEn: string;
  labelId: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
}

/** Shape sent to clients wherever a lookup value appears. */
export interface PublicLookup {
  code: string;
  label: string;
  icon: string | null;
  color: string | null;
}

export class LookupIndex {
  private readonly byIdMap = new Map<string, LookupRow>();
  private readonly byKey = new Map<string, LookupRow>();

  constructor(rows: LookupRow[]) {
    for (const row of rows) {
      this.byIdMap.set(row.id, row);
      this.byKey.set(`${row.groupCode}:${row.code}`, row);
    }
  }

  get(id: string | null | undefined): LookupRow | null {
    return id ? (this.byIdMap.get(id) ?? null) : null;
  }

  code(id: string | null | undefined): string | null {
    return this.get(id)?.code ?? null;
  }

  /** Id for (group, code), or null when the code doesn't exist. */
  idOf(group: LookupGroupCode, code: string | null | undefined): string | null {
    return code ? (this.byKey.get(`${group}:${code}`)?.id ?? null) : null;
  }

  /** Rows of a group in display order. */
  group(group: LookupGroupCode, includeInactive = false): LookupRow[] {
    return [...this.byIdMap.values()]
      .filter((r) => r.groupCode === group && (includeInactive || r.isActive))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  toPublic(id: string | null | undefined, locale: 'en' | 'id'): PublicLookup | null {
    const row = this.get(id);
    if (!row) return null;
    return {
      code: row.code,
      label: locale === 'id' ? (row.labelId ?? row.labelEn) : row.labelEn,
      icon: row.icon,
      color: row.color,
    };
  }
}

export async function loadLookups(db: DbClient): Promise<LookupIndex> {
  const rows = await db
    .select({
      id: lookups.id,
      groupCode: lookupGroups.code,
      code: lookups.code,
      labelEn: lookups.labelEn,
      labelId: lookups.labelId,
      icon: lookups.icon,
      color: lookups.color,
      sortOrder: lookups.sortOrder,
      isActive: lookups.isActive,
      isSystem: lookups.isSystem,
    })
    .from(lookups)
    .innerJoin(lookupGroups, eq(lookupGroups.id, lookups.groupId))
    .orderBy(asc(lookups.sortOrder));
  return new LookupIndex(rows);
}

/** Resolve one (group, code) to its id, for code paths that compare ids in memory. */
export async function lookupId(
  db: DbClient,
  group: LookupGroupCode,
  code: string | null | undefined,
): Promise<string | null> {
  if (!code) return null;
  const [row] = await db.select({ id: lk(group, code) }).from(sql`(select 1) as one`);
  return row?.id ?? null;
}

/** Insert/update values where any column may be a SQL expression such as `lk(...)`. */
export type WithSql<T> = { [K in keyof T]: T[K] | SQL<unknown> };

/**
 * Reject unknown lookup codes from user input with a 400 (instead of a NOT NULL violation).
 * `pairs` maps a field name to [group, code]; empty codes are skipped.
 */
export async function assertLookupCodes(
  db: DbClient,
  pairs: Record<string, [LookupGroupCode, string | null | undefined]>,
): Promise<void> {
  const entries = Object.entries(pairs).filter(([, [, code]]) => Boolean(code));
  if (entries.length === 0) return;
  const index = await loadLookups(db);
  const bad = entries.filter(([, [group, code]]) => !index.idOf(group, code));
  if (bad.length > 0) {
    throw badRequest(
      'Unknown master-data value',
      'VALIDATION_ERROR',
      bad.map(([path, [group, code]]) => ({ path, message: `"${code}" is not a ${group} code` })),
    );
  }
}
