import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import type { ResourceConfig } from '@/services/resource-registry';
import type { AppEnv } from '@/types/env';
import { parseReorderDto } from './reorder.dto';
import { ReorderContentRepository } from './reorder.repository';
import { ReorderContentService } from './reorder.service';

export class ReorderContentController extends BaseController {
  async handle(c: Context<AppEnv>, config: ResourceConfig) {
    const body = await c.req.json();
    const { ids } = parseReorderDto(body);
    const service = new ReorderContentService(new ReorderContentRepository(this.db(c)));
    await service.execute(c.env, this.user(c), config, ids);
    return this.ok(c, { reordered: ids.length });
  }
}
