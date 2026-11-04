import { BaseService } from '@/core/base';
import { badRequest, forbidden, unauthenticated } from '@/lib/errors';
import { verifyPassword } from '@/lib/password';
import { decryptTotpSecret, verifyTotpCode } from '@/lib/totp';
import type { AuthUser } from '@/types/env';
import type { Disable2faRepository } from './disable-2fa.repository';

export class Disable2faService extends BaseService<Disable2faRepository> {
  async execute(
    user: AuthUser,
    input: { code: string; password: string; jwtSecret: string },
  ): Promise<void> {
    if (user.role === 'owner') {
      throw forbidden('Owner accounts cannot disable 2FA');
    }

    const userRow = await this.repo.findUserById(user.id);
    if (!userRow || !userRow.totpSecret || !userRow.totpEnabled) {
      throw badRequest('2FA is not currently enabled');
    }

    const pwOk = await verifyPassword(input.password, userRow.passwordHash);
    if (!pwOk) {
      throw unauthenticated('Invalid password');
    }

    const secret = await decryptTotpSecret(userRow.totpSecret, input.jwtSecret);
    const codeOk = await verifyTotpCode(secret, input.code);
    if (!codeOk) {
      throw unauthenticated('Invalid 2FA verification code', 'TOTP_INVALID');
    }

    await this.repo.clearTotp(user.id);
    await this.repo.createAuditLog(user.id);
  }
}
