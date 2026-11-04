import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import type { AppEnv } from '@/types/env';
import { deleteUserParamDto } from './delete.dto';
import { DeleteUserRepository } from './delete.repository';
import { DeleteUserService } from './delete.service';

export class DeleteUserController extends BaseController {
  async handle(c: Context<AppEnv>) {
    const { id } = deleteUserParamDto.parse({ id: c.req.param('id') });
    const actor = this.user(c);
    const service = new DeleteUserService(new DeleteUserRepository(this.db(c)));
    await service.execute(actor, id);
    return this.noContent(c);
  }
}
