import type { Context } from 'hono';
import { deleteCookie } from 'hono/cookie';
import { BaseController } from '@/core/base';
import { SESSION_COOKIE_NAME } from '@/middleware/auth';
import type { AppEnv } from '@/types/env';
import { changePasswordBodyDto } from './change-password.dto';
import { ChangePasswordRepository } from './change-password.repository';
import { ChangePasswordService } from './change-password.service';

export class ChangePasswordController extends BaseController {
  async handle(c: Context<AppEnv>) {
    const body = changePasswordBodyDto.parse(await c.req.json());
    const user = this.user(c);
    const db = this.db(c);
    const service = new ChangePasswordService(new ChangePasswordRepository(db));
    await service.execute(user, body);
    deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
    return this.noContent(c);
  }
}
