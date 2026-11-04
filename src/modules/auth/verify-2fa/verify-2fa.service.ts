import { BaseService } from '@/core/base';
import { badRequest, unauthenticated } from '@/lib/errors';
import { signSession, verifyPre2faToken } from '@/lib/jwt';
import { decryptTotpSecret, verifyTotpCode } from '@/lib/totp';
import { memoryRateLimit } from '@/middleware/rate-limit';
import type { AuthUser } from '@/types/env';
import type { Verify2faRepository } from './verify-2fa.repository';

export class Verify2faService extends BaseService<Verify2faRepository> {
  async execute(input: {
    pre2faToken: string;
    code: string;
    jwtSecret: string;
  }): Promise<{ sessionToken: string; user: AuthUser }> {
    const rl = memoryRateLimit(`2fa:${input.pre2faToken}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      throw badRequest('Too many 2FA attempts', 'RATE_LIMITED');
    }

    const payload = await verifyPre2faToken(input.pre2faToken, input.jwtSecret);
    const userRow = await this.repo.findUserById(payload.sub);

    if (!userRow || !userRow.isActive || !userRow.totpSecret) {
      throw unauthenticated('Invalid 2FA session');
    }

    const plainSecret = await decryptTotpSecret(userRow.totpSecret, input.jwtSecret);
    const isValidCode = await verifyTotpCode(plainSecret, input.code);
    if (!isValidCode) {
      throw unauthenticated('Invalid 2FA verification code', 'TOTP_INVALID');
    }

    await this.repo.updateLastLogin(userRow.id);
    await this.repo.createAuditLog(userRow.id, userRow.name);

    const sessionToken = await signSession(
      { sub: userRow.id, role: userRow.role, tv: userRow.tokenVersion },
      input.jwtSecret,
    );

    return {
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

