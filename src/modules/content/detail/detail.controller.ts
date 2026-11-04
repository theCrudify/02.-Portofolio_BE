import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import type { ResourceConfig } from '@/services/resource-registry';
import type { AppEnv } from '@/types/env';
import { DetailContentRepository } from './detail.repository';
import { DetailContentService } from './detail.service';

export class DetailContentController extends BaseController {
  async handle(c: Context<AppEnv>, config: ResourceConfig) {
    const id = c.req.param('id')!;
    const service = new DetailContentService(new DetailContentRepository(this.db(c)));
    const item = await service.execute(config, id);
    return this.ok(c, item);
  }
}
