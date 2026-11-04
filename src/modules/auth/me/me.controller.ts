import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import type { AppEnv } from '@/types/env';
import { MeRepository } from './me.repository';
import { MeService } from './me.service';

export class MeController extends BaseController {
  handle(c: Context<AppEnv>) {
    const user = this.user(c);
    const service = new MeService(new MeRepository(this.db(c)));
    return this.ok(c, service.getProfile(user));
  }
}
