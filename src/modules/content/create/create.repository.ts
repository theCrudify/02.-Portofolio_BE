import { createItem } from '@/services/content-store';
import { lk } from '@/db/queries/lookups';
import { and, eq, isNull } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import { auditLogs } from '@/db/schema';
import type { ResourceConfig } from '@/services/resource-registry';

export class CreateContentRepository extends BaseRepository {
  async findBySlug(config: ResourceConfig, slug: string): Promise<Record<string, unknown> | null> {
    const rows = (await this.db
      .select()
      .from(config.table)
      .where(and(eq(config.table.slug, slug), isNull(config.table.deletedAt)))
      .limit(1)) as Record<string, unknown>[];
    return rows[0] ?? null;
  }

  async insert(config: ResourceConfig, values: Record<string, unknown>): Promise<Record<string, unknown>> {
    return createItem(this.db, config, values);
  }

  async writeAudit(userId: string, resource: string, resourceId: string): Promise<void> {
    await this.db.insert(auditLogs).values({
      userId,
      actionId: lk('audit_action', 'create'),
      resource: resource.slice(0, 40),
      resourceId,
      summary: `Created ${resource}`,
    });
  }
}
