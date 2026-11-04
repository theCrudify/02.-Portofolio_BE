import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { setTestDb, type DbClient } from '@/db/client';
import { lk } from '@/db/queries/lookups';
import * as schema from '@/db/schema';

/**
 * A real Postgres (PGlite, in-process) built from the committed migrations, so tests exercise
 * the same schema, lookups and SQL as production.
 */
// Migrating takes ~2s, so each test file migrates once and every test gets a copy of the result.
let migrated: Promise<File | Blob> | null = null;
function migratedSnapshot(): Promise<File | Blob> {
  migrated ??= (async () => {
    const client = new PGlite();
    await migrate(drizzle(client, { schema }), {
      migrationsFolder: path.resolve(__dirname, '../../drizzle'),
    });
    const dump = await client.dumpDataDir();
    await client.close();
    return dump;
  })();
  return migrated;
}

export async function createTestDb(): Promise<DbClient> {
  const db = drizzle(new PGlite({ loadDataDir: await migratedSnapshot() }), { schema });
  // Production uses neon-http's db.batch; running the statements in order is equivalent for tests.
  Object.assign(db, {
    batch: async (statements: PromiseLike<unknown>[]) => {
      const results: unknown[] = [];
      for (const statement of statements) results.push(await statement);
      return results;
    },
  });
  return db as unknown as DbClient;
}

/** Fresh migrated database injected as the app's DB. */
export async function useTestDb(): Promise<DbClient> {
  const db = await createTestDb();
  setTestDb(db);
  return db;
}

export const published = () => ({ statusId: lk('content_status', 'published'), publishedAt: new Date() });
export const draft = () => ({ statusId: lk('content_status', 'draft') });
export const archived = () => ({ statusId: lk('content_status', 'archived') });

/** Lookup id for (group, code), for building fixtures and admin payloads. */
export async function lookupIdOf(db: DbClient, group: string, code: string): Promise<string> {
  const [row] = await db
    .select({ id: schema.lookups.id })
    .from(schema.lookups)
    .innerJoin(schema.lookupGroups, eq(schema.lookupGroups.id, schema.lookups.groupId))
    .where(and(eq(schema.lookupGroups.code, group), eq(schema.lookups.code, code)));
  if (!row) throw new Error(`No lookup ${group}.${code}`);
  return row.id;
}

export async function insertOrganization(
  db: DbClient,
  values: { name: string; slug?: string; type?: string; logoMediaId?: string | null; websiteUrl?: string | null },
): Promise<string> {
  const [row] = await db
    .insert(schema.organizations)
    .values({
      name: values.name,
      slug: values.slug ?? values.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      typeId: lk('organization_type', values.type ?? 'company'),
      logoMediaId: values.logoMediaId ?? null,
      websiteUrl: values.websiteUrl ?? null,
      ...published(),
    })
    .returning({ id: schema.organizations.id });
  return row!.id;
}
