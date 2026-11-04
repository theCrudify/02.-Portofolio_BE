import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { getJwtSecret } from '@/lib/jwt';
import type { AppEnv } from '@/types/env';
import { Setup2faRepository } from './setup-2fa.repository';
import { Setup2faService } from './setup-2fa.service';

export class Setup2faController extends BaseController {
  async handle(c: Context<AppEnv>) {
    const user = this.user(c);
    const db = this.db(c);
    const jwtSecret = getJwtSecret(c.env);
    const service = new Setup2faService(new Setup2faRepository(db));
    const result = await service.execute(user, jwtSecret);
    return this.ok(c, result);
  }
}

