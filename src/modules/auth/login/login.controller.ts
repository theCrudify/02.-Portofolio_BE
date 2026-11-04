import type { Context } from 'hono';
import { setCookie } from 'hono/cookie';
import { BaseController } from '@/core/base';
import { AppError } from '@/lib/errors';
import { getHashSalt, ipHash } from '@/lib/hash';
import { getJwtSecret } from '@/lib/jwt';
import { PRE_2FA_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/middleware/auth';
import type { AppEnv } from '@/types/env';
import type { LoginBodyDto } from './login.dto';
import { LoginRepository } from './login.repository';
import { LoginService } from './login.service';

const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60;
const FIVE_MINUTES_SEC = 5 * 60;

export class LoginController extends BaseController {
  async handle(c: Context<AppEnv>, body: LoginBodyDto) {
    const db = this.db(c);
    const clientIp = c.req.header('cf-connecting-ip') || '127.0.0.1';
    const salt = getHashSalt(c.env);
    const jwtSecret = getJwtSecret(c.env);
    const hashedIp = await ipHash(clientIp, salt);

    const service = new LoginService(new LoginRepository(db));

    try {
      const result = await service.execute({
        email: body.email,
        password: body.password,
        ipHash: hashedIp,
        jwtSecret,
      });

      if (result.status === 'totp_required') {
        setCookie(c, PRE_2FA_COOKIE_NAME, result.pre2faToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'Lax',
          path: '/',
          maxAge: FIVE_MINUTES_SEC,
        });
        return this.fail(c, 401, 'TOTP_REQUIRED', 'Two-factor authentication code is required');
      }

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
          mustEnable2fa: result.user.role === 'owner' && !result.user.totpEnabled,
        },
      });
    } catch (err) {
      if (err instanceof AppError && err.status === 429) {
        c.header('Retry-After', '900');
      }
      throw err;
    }
  }
}

