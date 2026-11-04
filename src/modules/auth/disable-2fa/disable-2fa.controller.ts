import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { getJwtSecret } from '@/lib/jwt';
import type { AppEnv } from '@/types/env';
import { disable2faBodyDto } from './disable-2fa.dto';
import { Disable2faRepository } from './disable-2fa.repository';
import { Disable2faService } from './disable-2fa.service';

export class Disable2faController extends BaseController {
  async handle(c: Context<AppEnv>) {
    const body = disable2faBodyDto.parse(await c.req.json());
    const user = this.user(c);
    const db = this.db(c);
    const jwtSecret = getJwtSecret(c.env);
    const service = new Disable2faService(new Disable2faRepository(db));
    await service.execute(user, {
      code: body.code,
      password: body.password,
      jwtSecret,
    });
    return this.ok(c, { ok: true });
  }
}
