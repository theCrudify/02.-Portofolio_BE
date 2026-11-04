import { BaseService } from '@/core/base';
import { AppError } from '@/lib/errors';
import type { ResourceConfig } from '@/services/resource-registry';
import type { AuthUser, Env } from '@/types/env';
import type { CreateContentRepository } from './create.repository';

export class CreateContentService extends BaseService<CreateContentRepository> {
  async execute(
    _env: Env,
    user: AuthUser,
    config: ResourceConfig,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (config.hasSlug && typeof payload.slug === 'string') {
      const existing = await this.repo.findBySlug(config, payload.slug);
      if (existing) {
        throw new AppError(409, 'CONFLICT', `Slug "${payload.slug}" is already in use.`);
      }
    }

    const cleanPayload = { ...payload };
    delete cleanPayload.confirmSlugChange;
    if ('CompletedAt' in cleanPayload && !('completedAt' in cleanPayload)) {
      cleanPayload.completedAt = cleanPayload.CompletedAt;
    }
    delete cleanPayload.CompletedAt;

    const item = await this.repo.insert(config, cleanPayload);
    await this.repo.writeAudit(user.id, config.name, String(item.id));
    return item;
  }
}
