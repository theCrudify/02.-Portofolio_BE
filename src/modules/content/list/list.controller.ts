import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import type { ResourceConfig } from '@/services/resource-registry';
import type { AppEnv } from '@/types/env';
import { listContentQueryDto } from './list.dto';
import { ListContentRepository } from './list.repository';
import { ListContentService } from './list.service';

export class ListContentController extends BaseController {
  async handle(c: Context<AppEnv>, config: ResourceConfig) {
    const rawQuery = c.req.query();
    const parsed = listContentQueryDto.parse({
      ...rawQuery,
      limit: rawQuery.limit ?? 50,
    });
    const includeDeleted = Boolean(parsed.includeDeleted && c.get('user')?.role === 'owner');
    const service = new ListContentService(new ListContentRepository(this.db(c)));
    const result = await service.execute(config, {
      ...parsed,
      includeDeleted,
    });
    return this.ok(c, result.data, result.meta);
  }
}
