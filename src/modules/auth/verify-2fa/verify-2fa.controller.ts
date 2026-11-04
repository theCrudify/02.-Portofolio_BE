import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { BaseController } from '@/core/base';
import { unauthenticated } from '@/lib/errors';
import { getJwtSecret } from '@/lib/jwt';
import { PRE_2FA_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/middleware/auth';
import type { AppEnv } from '@/types/env';
import type { Verify2faBodyDto } from './verify-2fa.dto';
import { Verify2faRepository } from './verify-2fa.repository';
import { Verify2faService } from './verify-2fa.service';

const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60;

export class Verify2faController extends BaseController {
  async handle(c: Context<AppEnv>, body: Verify2faBodyDto) {
    const pre2faToken = getCookie(c, PRE_2FA_COOKIE_NAME);
    if (!pre2faToken) {
      throw unauthenticated('Missing 2FA session cookie');
    }

    const db = this.db(c);
    const jwtSecret = getJwtSecret(c.env);
    const service = new Verify2faService(new Verify2faRepository(db));

    const result = await service.execute({
      pre2faToken,
      code: body.code,
      jwtSecret,
    });

    deleteCookie(c, PRE_2FA_COOKIE_NAME, { path: '/' });
    setCookie(c, SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: SEVEN_DAYS_SEC,
    });

    return this.ok(c, {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        totpEnabled: result.user.totpEnabled,
        mustEnable2fa: false,
      },
    });
  }
}

