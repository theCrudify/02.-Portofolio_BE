import { BaseService } from '@/core/base';
import { conflict } from '@/lib/errors';
import { buildOtpAuthUrl, encryptTotpSecret, generateTotpSecret } from '@/lib/totp';
import type { AuthUser } from '@/types/env';
import type { Setup2faRepository } from './setup-2fa.repository';

export class Setup2faService extends BaseService<Setup2faRepository> {
  async execute(user: AuthUser, jwtSecret: string): Promise<{ secret: string; otpauthUrl: string }> {
    if (user.totpEnabled) {
      throw conflict('2FA is already enabled. Disable it first.');
    }
    const secret = generateTotpSecret();
    const encrypted = await encryptTotpSecret(secret, jwtSecret);
    await this.repo.savePendingTotpSecret(user.id, encrypted);
    const otpauthUrl = buildOtpAuthUrl(user.email, secret, 'Portfolio');
    return { secret, otpauthUrl };
  }
}

