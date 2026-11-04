import { and, eq, isNull } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import { auditLogs } from '@/db/schema';
import type { ResourceConfig } from '@/services/resource-registry';

export class UpdateContentRepository extends BaseRepository {
  async findById(config: ResourceConfig, id: string): Promise<Record<string, unknown> | null> {
    const rows = (await this.db
      .select()
      .from(config.table)
      .where(eq(config.table.id, id))
      .limit(1)) as Record<string, unknown>[];
    return rows[0] ?? null;
  }

  async findBySlug(config: ResourceConfig, slug: string): Promise<Record<string, unknown> | null> {
    const rows = (await this.db
      .select()
      .from(config.table)
      .where(and(eq(config.table.slug, slug), isNull(config.table.deletedAt)))
      .limit(1)) as Record<string, unknown>[];
    return rows[0] ?? null;
  }

  async updateById(
    config: ResourceConfig,
    id: string,
    values: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const updatedRows = (await this.db
      .update(config.table)
      .set({
        ...values,
        updatedAt: new Date(),
      })
      .where(eq(config.table.id, id))
      .returning()) as Record<string, unknown>[];
    return updatedRows[0]!;
  }

  async writeAudit(userId: string, resource: string, resourceId: string): Promise<void> {
    await this.db.insert(auditLogs).values({
      userId,
      action: 'update',
      resource: resource.slice(0, 40),
      resourceId,
      summary: `Updated ${resource}`,
    });
  }
}
