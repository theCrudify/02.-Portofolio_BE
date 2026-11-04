import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { Bindings } from '@/types/env';

export type DbClient = NeonHttpDatabase<Record<string, never>>;

export function getDb(env: Pick<Bindings, 'DATABASE_URL'>): DbClient {
  const sql = neon(env.DATABASE_URL);
  return drizzle({ client: sql });
}
