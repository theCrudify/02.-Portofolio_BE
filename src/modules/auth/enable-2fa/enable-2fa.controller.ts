import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { getJwtSecret } from '@/lib/jwt';
import type { AppEnv } from '@/types/env';
import { enable2faBodyDto } from './enable-2fa.dto';
import { Enable2faRepository } from './enable-2fa.repository';
import { Enable2faService } from './enable-2fa.service';

export class Enable2faController extends BaseController {
  async handle(c: Context<AppEnv>) {
    const body = enable2faBodyDto.parse(await c.req.json());
    const user = this.user(c);
    const db = this.db(c);
    const jwtSecret = getJwtSecret(c.env);
    const service = new Enable2faService(new Enable2faRepository(db));
    await service.execute(user, body.code, jwtSecret);
    return this.ok(c, { ok: true });
  }
}

