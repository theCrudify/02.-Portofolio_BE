import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import type { AppEnv } from '@/types/env';
import { listUsersQueryDto } from './list.dto';
import { ListUsersRepository } from './list.repository';
import { ListUsersService } from './list.service';

export class ListUsersController extends BaseController {
  async handle(c: Context<AppEnv>) {
    const rawQuery = c.req.query();
    const hasPaginationOrFilter = Object.keys(rawQuery).length > 0;
    const parsedQuery = hasPaginationOrFilter ? listUsersQueryDto.parse(rawQuery) : {};

    const service = new ListUsersService(new ListUsersRepository(this.db(c)));
    const { items, meta } = await service.execute(parsedQuery);
    return this.ok(c, items, hasPaginationOrFilter ? meta : undefined);
  }
}
