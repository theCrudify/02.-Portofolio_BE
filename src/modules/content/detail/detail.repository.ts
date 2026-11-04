import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import type { ResourceConfig } from '@/services/resource-registry';

export class DetailContentRepository extends BaseRepository {
  async findById(config: ResourceConfig, id: string): Promise<Record<string, unknown> | null> {
    const rows = (await this.db
      .select()
      .from(config.table)
      .where(eq(config.table.id, id))
      .limit(1)) as Record<string, unknown>[];
    return rows[0] ?? null;
  }
}
