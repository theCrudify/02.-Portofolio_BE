import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import { auditLogs } from '@/db/schema';
import type { ResourceConfig } from '@/services/resource-registry';

export class DeleteContentRepository extends BaseRepository {
  async findById(config: ResourceConfig, id: string): Promise<Record<string, unknown> | null> {
    const rows = (await this.db
      .select()
      .from(config.table)
      .where(eq(config.table.id, id))
      .limit(1)) as Record<string, unknown>[];
    return rows[0] ?? null;
  }

  async softDelete(config: ResourceConfig, id: string): Promise<void> {
    await this.db
      .update(config.table)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(config.table.id, id));
  }

  async hardDelete(config: ResourceConfig, id: string): Promise<void> {
    await this.db.delete(config.table).where(eq(config.table.id, id));
  }

  async writeAudit(
    userId: string,
    action: 'delete' | 'delete_permanent',
    resource: string,
    resourceId: string,
    summary: string,
  ): Promise<void> {
    await this.db.insert(auditLogs).values({
      userId,
      action,
      resource: resource.slice(0, 40),
      resourceId,
      summary,
    });
  }
}
