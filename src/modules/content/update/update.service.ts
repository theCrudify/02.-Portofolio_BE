import { BaseService } from '@/core/base';
import { AppError } from '@/lib/errors';
import { revalidate } from '@/lib/revalidate';
import type { ResourceConfig } from '@/services/resource-registry';
import type { AuthUser, Env } from '@/types/env';
import type { UpdateContentRepository } from './update.repository';

export class UpdateContentService extends BaseService<UpdateContentRepository> {
  async execute(
    env: Env,
    user: AuthUser,
    config: ResourceConfig,
    id: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const existing = await this.repo.findById(config, id);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `${config.name} item not found.`);
    }

    if (user.role === 'editor' && existing.status !== 'draft') {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Editors can only edit items that are currently in draft status.',
      );
    }

    if (
      config.hasSlug &&
      typeof payload.slug === 'string' &&
      payload.slug !== existing.slug
    ) {
      if (existing.status === 'published' && !payload.confirmSlugChange) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Changing the slug of a published item requires confirmSlugChange: true.',
        );
      }
      const dup = await this.repo.findBySlug(config, payload.slug);
      if (dup && dup.id !== id) {
        throw new AppError(409, 'CONFLICT', `Slug "${payload.slug}" is already in use.`);
      }
    }

    const cleanPayload = { ...payload };
    delete cleanPayload.confirmSlugChange;
    delete cleanPayload.status;
    delete cleanPayload.publishedAt;
    delete cleanPayload.deletedAt;
    if ('CompletedAt' in cleanPayload && !('completedAt' in cleanPayload)) {
      cleanPayload.completedAt = cleanPayload.CompletedAt;
    }
    delete cleanPayload.CompletedAt;

    const item = await this.repo.updateById(config, id, cleanPayload);
    await this.repo.writeAudit(user.id, config.name, id);

    if (item.status === 'published') {
      await revalidate(env, config.revalidateTags(item));
    }

    return item;
  }
}
