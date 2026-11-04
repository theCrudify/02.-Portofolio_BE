import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import type { ResourceConfig } from '@/services/resource-registry';
import type { AppEnv } from '@/types/env';
import { validateUpdateContentPayload } from './update.dto';
import { UpdateContentRepository } from './update.repository';
import { UpdateContentService } from './update.service';

export class UpdateContentController extends BaseController {
  async handle(c: Context<AppEnv>, config: ResourceConfig) {
    const id = c.req.param('id')!;
    const body = await c.req.json();
    const validated = validateUpdateContentPayload(config, body);
    const service = new UpdateContentService(new UpdateContentRepository(this.db(c)));
    const updated = await service.execute(c.env, this.user(c), config, id, validated);
    return this.ok(c, updated);
  }
}
