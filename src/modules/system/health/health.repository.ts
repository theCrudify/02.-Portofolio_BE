import { sql } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';

export class HealthRepository extends BaseRepository {
  async ping(): Promise<'ok' | 'error'> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return 'ok';
    } catch {
      return 'error';
    }
  }
}
