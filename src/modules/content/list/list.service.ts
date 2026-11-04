import { BaseService } from '@/core/base';
import type { ResourceConfig } from '@/services/resource-registry';
import type { ListContentQueryDto } from './list.dto';
import type { ListContentRepository } from './list.repository';

export class ListContentService extends BaseService<ListContentRepository> {
  async execute(config: ResourceConfig, query: Partial<ListContentQueryDto>) {
    return this.repo.list(config, query);
  }
}
