import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { loadLookups } from '@/db/queries/lookups';
import { LOOKUP_SEED } from '@/db/lookup-data';
import { createTestDb } from './helpers/db';

describe('Migrations · lookups instead of enums, rows instead of arrays', () => {
  it('builds the schema from drizzle/ with no enum types and no array/json columns', async () => {
    const db = await createTestDb();
    const enums = await db.execute(sql`select count(*)::int as n from pg_type where typtype = 'e'`);
    const json = await db.execute(sql`
      select table_name, column_name from information_schema.columns
      where table_schema = 'public' and (data_type in ('json', 'jsonb') or data_type = 'ARRAY')`);
    expect((enums as unknown as { rows: { n: number }[] }).rows[0]!.n).toBe(0);
    // github_cache.data is a raw external API snapshot, not portfolio data.
    expect((json as unknown as { rows: unknown[] }).rows).toEqual([
      { table_name: 'github_cache', column_name: 'data' },
    ]);
  });

  it('seeds every lookup group and value from lookup-data.ts', async () => {
    const db = await createTestDb();
    const index = await loadLookups(db);
    for (const group of LOOKUP_SEED) {
      expect(index.group(group.code as never).map((r) => r.code)).toEqual(group.values.map((v) => v.code));
    }
    expect(index.idOf('content_status', 'published')).toBeTruthy();
  });
});
