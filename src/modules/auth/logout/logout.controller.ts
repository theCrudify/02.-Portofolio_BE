import type { Context } from 'hono';
import { deleteCookie } from 'hono/cookie';
import { BaseController } from '@/core/base';
import { SESSION_COOKIE_NAME } from '@/middleware/auth';
import type { AppEnv } from '@/types/env';
import { LogoutRepository } from './logout.repository';
import { LogoutService } from './logout.service';

export class LogoutController extends BaseController {
  async handleSingle(c: Context<AppEnv>) {
    const user = this.user(c);
    const service = new LogoutService(new LogoutRepository(this.db(c)));
    await service.logoutSingle(user);
    deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
    return this.noContent(c);
  }

  async handleAll(c: Context<AppEnv>) {
    const user = this.user(c);
    const service = new LogoutService(new LogoutRepository(this.db(c)));
    await service.logoutAllDevices(user);
    deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
    return this.noContent(c);
  }
}
