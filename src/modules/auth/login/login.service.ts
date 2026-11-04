import { BaseService } from '@/core/base';
import { unauthenticated } from '@/lib/errors';
import { signPre2faToken, signSession } from '@/lib/jwt';
import { verifyPassword } from '@/lib/password';
import { checkLoginRateLimit } from '@/middleware/rate-limit';
import type { AuthUser } from '@/types/env';
import type { LoginRepository } from './login.repository';

export type LoginResult =
  | { status: 'authenticated'; sessionToken: string; user: AuthUser }
  | { status: 'totp_required'; pre2faToken: string };

export class LoginService extends BaseService<LoginRepository> {
  async execute(input: {
    email: string;
    password: string;
    ipHash: string;
    jwtSecret: string;
  }): Promise<LoginResult> {
    await checkLoginRateLimit(this.repo.db, input.ipHash);

    const normalizedEmail = input.email.trim().toLowerCase();
    const userRow = await this.repo.findUserByEmail(normalizedEmail);

    if (!userRow || !userRow.isActive) {
      await this.repo.recordAttempt(input.ipHash, normalizedEmail, false);
      throw unauthenticated('Invalid email or password');
    }

    const validPw = await verifyPassword(input.password, userRow.passwordHash);
    if (!validPw) {
      await this.repo.recordAttempt(input.ipHash, normalizedEmail, false);
      throw unauthenticated('Invalid email or password');
    }

    if (userRow.totpEnabled && userRow.totpSecret) {
      const pre2faToken = await signPre2faToken({ sub: userRow.id }, input.jwtSecret);
      return { status: 'totp_required', pre2faToken };
    }

    await this.repo.recordAttempt(input.ipHash, normalizedEmail, true);
    await this.repo.updateLastLogin(userRow.id);
    await this.repo.createAuditLog(userRow.id, userRow.name);

    const sessionToken = await signSession(
      { sub: userRow.id, role: userRow.role, tv: userRow.tokenVersion },
      input.jwtSecret,
    );

    return {
      status: 'authenticated',
      sessionToken,
      user: {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        role: userRow.role,
        tokenVersion: userRow.tokenVersion,
        totpEnabled: userRow.totpEnabled,
      },
    };
  }
}

