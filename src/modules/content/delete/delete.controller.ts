import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import type { ResourceConfig } from '@/services/resource-registry';
import type { AppEnv } from '@/types/env';
import { DeleteContentRepository } from './delete.repository';
import { DeleteContentService } from './delete.service';

export class DeleteContentController extends BaseController {
  async handleSoft(c: Context<AppEnv>, config: ResourceConfig) {
    const id = c.req.param('id')!;
    const service = new DeleteContentService(new DeleteContentRepository(this.db(c)));
    await service.softDelete(c.env, this.user(c), config, id);
    return this.noContent(c);
  }

  async handlePermanent(c: Context<AppEnv>, config: ResourceConfig) {
    const id = c.req.param('id')!;
    const service = new DeleteContentService(new DeleteContentRepository(this.db(c)));
    await service.deletePermanent(c.env, this.user(c), config, id);
    return this.noContent(c);
  }
}
