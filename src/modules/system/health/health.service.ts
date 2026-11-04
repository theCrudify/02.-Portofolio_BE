import { getDb } from '@/db/client';
import type { Env } from '@/types/env';
import { HealthRepository } from './health.repository';

export class HealthService {
  async execute(env: Env) {
    let dbStatus: 'ok' | 'error' = 'ok';
    if (env?.DATABASE_URL) {
      try {
        const db = getDb(env);
        const repo = new HealthRepository(db);
        dbStatus = await repo.ping();
      } catch {
        dbStatus = 'error';
      }
    }

    return {
      status: 'ok' as const,
      db: dbStatus,
      time: new Date().toISOString(),
    };
  }
}
