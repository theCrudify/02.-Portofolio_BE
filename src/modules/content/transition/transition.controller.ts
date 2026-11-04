import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { ApiError } from '@/lib/errors';
import type { ResourceConfig } from '@/services/resource-registry';
import type { AppEnv } from '@/types/env';
import type { TransitionActionDto } from './transition.dto';
import { TransitionContentRepository } from './transition.repository';
import { TransitionContentService } from './transition.service';

export class TransitionContentController extends BaseController {
  async handle(c: Context<AppEnv>, config: ResourceConfig) {
    const id = c.req.param('id')!;
    const action = c.req.param('action') as TransitionActionDto;
    if (!['publish', 'unpublish', 'archive', 'restore'].includes(action)) {
      throw new ApiError(404, 'NOT_FOUND', `Unknown action "${action}".`);
    }
    const service = new TransitionContentService(new TransitionContentRepository(this.db(c)));
    const item = await service.execute(c.env, this.user(c), config, id, action);
    return this.ok(c, item);
  }
}
