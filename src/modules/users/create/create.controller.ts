import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { assertLookupCodes } from '@/db/queries/lookups';
import type { AppEnv, UserRole } from '@/types/env';
import { createUserBodyDto } from './create.dto';
import { CreateUserRepository } from './create.repository';
import { CreateUserService } from './create.service';

export class CreateUserController extends BaseController {
  async handle(c: Context<AppEnv>) {
    const body = createUserBodyDto.parse(await c.req.json());
    await assertLookupCodes(this.db(c), { role: ['user_role', body.role] });
    const actor = this.user(c);
    const service = new CreateUserService(new CreateUserRepository(this.db(c)));
    const created = await service.execute(actor, { ...body, role: body.role as UserRole });
    return this.ok(c, created, undefined, 201);
  }
}
