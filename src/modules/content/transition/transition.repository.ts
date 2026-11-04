import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import { auditLogs } from '@/db/schema';
import type { ResourceConfig } from '@/services/resource-registry';
import type { ContentStatus } from '@/services/content.service';
import type { TransitionActionDto } from './transition.dto';

export class TransitionContentRepository extends BaseRepository {
  async findById(config: ResourceConfig, id: string): Promise<Record<string, unknown> | null> {
    const rows = (await this.db
      .select()
      .from(config.table)
      .where(eq(config.table.id, id))
      .limit(1)) as Record<string, unknown>[];
    return rows[0] ?? null;
  }

  async updateStatus(
    config: ResourceConfig,
    id: string,
    nextStatus: ContentStatus,
    publishedAt: unknown,
  ): Promise<Record<string, unknown>> {
    const now = new Date();
    const updatedRows = (await this.db
      .update(config.table)
      .set({
        status: nextStatus,
        publishedAt,
        updatedAt: now,
      })
      .where(eq(config.table.id, id))
      .returning()) as Record<string, unknown>[];
    return updatedRows[0]!;
  }

  async writeAudit(
    userId: string,
    action: TransitionActionDto,
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
