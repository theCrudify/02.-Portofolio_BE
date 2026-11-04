import { BaseService } from '@/core/base';
import { AppError } from '@/lib/errors';
import { revalidate } from '@/lib/revalidate';
import type { ResourceConfig } from '@/services/resource-registry';
import type { AuthUser, Env } from '@/types/env';
import type { DeleteContentRepository } from './delete.repository';

export class DeleteContentService extends BaseService<DeleteContentRepository> {
  async softDelete(
    env: Env,
    user: AuthUser,
    config: ResourceConfig,
    id: string,
  ): Promise<void> {
    const existing = await this.repo.findById(config, id);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `${config.name} item not found.`);
    }
    if (user.role === 'editor' && existing.status !== 'draft') {
      throw new AppError(403, 'FORBIDDEN', 'Editors can only delete items that are in draft status.');
    }

    await this.repo.softDelete(config, id);
    await this.repo.writeAudit(user.id, 'delete', config.name, id, `Soft deleted ${config.name}`);

    if (existing.status === 'published') {
      await revalidate(env, config.revalidateTags(existing));
    }
  }

  async deletePermanent(
    _env: Env,
    user: AuthUser,
    config: ResourceConfig,
    id: string,
  ): Promise<void> {
    const existing = await this.repo.findById(config, id);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `${config.name} item not found.`);
    }
    const isArchived = existing.status === 'archived';
    const isSoftDeleted = Boolean(existing.deletedAt);

    if (!isArchived && !isSoftDeleted) {
      throw new AppError(
        400,
        'INVALID_STATE',
        'Permanent deletion requires the item to be archived or soft-deleted first.',
      );
    }

    await this.repo.hardDelete(config, id);
    await this.repo.writeAudit(
      user.id,
      'delete_permanent',
      config.name,
      id,
      `Permanently deleted ${config.name}`,
    );
  }
}
