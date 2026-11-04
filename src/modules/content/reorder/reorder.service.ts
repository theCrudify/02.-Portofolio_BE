import { BaseService } from '@/core/base';
import { revalidate } from '@/lib/revalidate';
import type { ResourceConfig } from '@/services/resource-registry';
import type { AuthUser, Env } from '@/types/env';
import type { ReorderContentRepository } from './reorder.repository';

export class ReorderContentService extends BaseService<ReorderContentRepository> {
  async execute(
    env: Env,
    user: AuthUser,
    config: ResourceConfig,
    ids: string[],
  ): Promise<void> {
    await this.repo.batchUpdateOrder(config, ids);
    await this.repo.writeAudit(user.id, config.name, ids.length);
    await revalidate(env, config.revalidateTags());
  }
}
