import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import type { AppEnv } from '@/types/env';
import { updateUserBodyDto, updateUserParamDto } from './update.dto';
import { UpdateUserRepository } from './update.repository';
import { UpdateUserService } from './update.service';

export class UpdateUserController extends BaseController {
  async handle(c: Context<AppEnv>) {
    const { id } = updateUserParamDto.parse({ id: c.req.param('id') });
    const body = updateUserBodyDto.parse(await c.req.json());
    const actor = this.user(c);
    const service = new UpdateUserService(new UpdateUserRepository(this.db(c)));
    const updated = await service.execute(actor, id, body);
    return this.ok(c, updated);
  }
}
