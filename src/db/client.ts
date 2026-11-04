import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '@/db/schema';
import type { Bindings } from '@/types/env';

export type DbClient = NeonHttpDatabase<typeof schema>;
export type Database = DbClient;


let customDbForTest: DbClient | null = null;

export function setTestDb(db: DbClient | null): void {
  customDbForTest = db;
}

export function getDb(env: Pick<Bindings, 'DATABASE_URL'>): DbClient {
  if (customDbForTest) {
    return customDbForTest;
  }
  const sql = neon(env.DATABASE_URL);
  return drizzle({ client: sql, schema });
}
