import { lk } from '@/db/queries/lookups';
import { BaseRepository } from '@/core/base';
import { auditLogs } from '@/db/schema';
import type { ResourceConfig } from '@/services/resource-registry';
import { findItem, setStatus, type ContentStatus } from '@/services/content-store';
import type { TransitionActionDto } from './transition.dto';

export class TransitionContentRepository extends BaseRepository {
  async findById(config: ResourceConfig, id: string): Promise<Record<string, unknown> | null> {
    return findItem(this.db, config, id);
  }

  async updateStatus(
    config: ResourceConfig,
    id: string,
    nextStatus: ContentStatus,
    publishedAt: unknown,
  ): Promise<Record<string, unknown>> {
    return setStatus(this.db, config, id, nextStatus, publishedAt);
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
      actionId: lk('audit_action', action),
      resource: resource.slice(0, 40),
      resourceId,
      summary,
    });
  }
}
