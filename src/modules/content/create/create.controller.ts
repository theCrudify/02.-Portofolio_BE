import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import type { ResourceConfig } from '@/services/resource-registry';
import type { AppEnv } from '@/types/env';
import { validateCreateContentPayload } from './create.dto';
import { CreateContentRepository } from './create.repository';
import { CreateContentService } from './create.service';

export class CreateContentController extends BaseController {
  async handle(c: Context<AppEnv>, config: ResourceConfig) {
    const body = await c.req.json();
    const validated = validateCreateContentPayload(config, body);
    const service = new CreateContentService(new CreateContentRepository(this.db(c)));
    const created = await service.execute(c.env, this.user(c), config, validated);
    return this.ok(c, created, undefined, 201);
  }
}
