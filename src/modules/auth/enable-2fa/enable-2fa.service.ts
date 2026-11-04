import { BaseService } from '@/core/base';
import { badRequest, unauthenticated } from '@/lib/errors';
import { decryptTotpSecret, verifyTotpCode } from '@/lib/totp';
import type { AuthUser } from '@/types/env';
import type { Enable2faRepository } from './enable-2fa.repository';

export class Enable2faService extends BaseService<Enable2faRepository> {
  async execute(user: AuthUser, code: string, jwtSecret: string): Promise<void> {
    const userRow = await this.repo.findUserById(user.id);
    if (!userRow || !userRow.totpSecret) {
      throw badRequest('2FA setup has not been initialized');
    }

    const secret = await decryptTotpSecret(userRow.totpSecret, jwtSecret);
    const valid = await verifyTotpCode(secret, code);
    if (!valid) {
      throw unauthenticated('Invalid 2FA verification code', 'TOTP_INVALID');
    }

    await this.repo.activateTotp(user.id);
    await this.repo.createAuditLog(user.id);
  }
}

