import { BaseService } from '@/core/base';
import { AppError } from '@/lib/errors';
import { revalidate } from '@/lib/revalidate';
import type { ContentStatus } from '@/services/content-store';
import type { ResourceConfig } from '@/services/resource-registry';
import type { AuthUser, Env } from '@/types/env';
import type { TransitionActionDto } from './transition.dto';
import type { TransitionContentRepository } from './transition.repository';

const VALID_TRANSITIONS: Record<TransitionActionDto, { from: ContentStatus[]; to: ContentStatus }> = {
  publish: { from: ['draft'], to: 'published' },
  unpublish: { from: ['published'], to: 'draft' },
  archive: { from: ['draft', 'published'], to: 'archived' },
  restore: { from: ['archived'], to: 'draft' },
};

export class TransitionContentService extends BaseService<TransitionContentRepository> {
  async execute(
    env: Env,
    user: AuthUser,
    config: ResourceConfig,
    id: string,
    action: TransitionActionDto,
  ): Promise<Record<string, unknown>> {
    const existing = await this.repo.findById(config, id);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `${config.name} item not found.`);
    }
    if (existing.deletedAt) {
      throw new AppError(400, 'INVALID_STATE', 'Cannot transition a soft-deleted item.');
    }

    const currentStatus = existing.status as ContentStatus;
    const rule = VALID_TRANSITIONS[action];
    if (!rule.from.includes(currentStatus)) {
      throw new AppError(
        400,
        'INVALID_STATE',
        `Invalid status transition: cannot "${action}" an item in "${currentStatus}" status.`,
      );
    }

    const nextStatus = rule.to;
    const now = new Date();
    const publishedAt =
      action === 'publish' ? (existing.publishedAt ?? now) : existing.publishedAt;

    const item = await this.repo.updateStatus(config, id, nextStatus, publishedAt);
    await this.repo.writeAudit(user.id, action, config.name, id, `${currentStatus} -> ${nextStatus}`);
    await revalidate(env, config.revalidateTags(item));
    return item;
  }
}
