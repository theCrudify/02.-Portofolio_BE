import { readItem } from '@/services/content-store';
import { BaseRepository } from '@/core/base';
import type { ResourceConfig } from '@/services/resource-registry';

export class DetailContentRepository extends BaseRepository {
  async findById(config: ResourceConfig, id: string): Promise<Record<string, unknown> | null> {
    return readItem(this.db, config, id);
  }
}
