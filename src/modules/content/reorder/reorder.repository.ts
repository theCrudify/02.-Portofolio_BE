import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import { auditLogs } from '@/db/schema';
import type { ResourceConfig } from '@/services/resource-registry';

export class ReorderContentRepository extends BaseRepository {
  async batchUpdateOrder(config: ResourceConfig, ids: string[]): Promise<void> {
    const now = new Date();
    const updates = ids.map((id, index) =>
      this.db
        .update(config.table)
        .set({ sortOrder: index, updatedAt: now })
        .where(eq(config.table.id, id)),
    );
    await this.db.batch(updates as [(typeof updates)[number], ...(typeof updates)[number][]]);
  }

  async writeAudit(userId: string, resource: string, count: number): Promise<void> {
    await this.db.insert(auditLogs).values({
      userId,
      action: 'reorder',
      resource: resource.slice(0, 40),
      summary: `Reordered ${count} items`,
    });
  }
}
