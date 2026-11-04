import { BaseService } from '@/core/base';
import { AppError } from '@/lib/errors';
import type { ResourceConfig } from '@/services/resource-registry';
import type { DetailContentRepository } from './detail.repository';

export class DetailContentService extends BaseService<DetailContentRepository> {
  async execute(config: ResourceConfig, id: string): Promise<Record<string, unknown>> {
    const row = await this.repo.findById(config, id);
    if (!row) {
      throw new AppError(404, 'NOT_FOUND', `${config.name} item not found.`);
    }
    return row;
  }
}
