import { BaseService } from '@/core/base';
import { notFound, unauthenticated } from '@/lib/errors';
import { hashPassword, verifyPassword } from '@/lib/password';
import type { AuthUser } from '@/types/env';
import type { ChangePasswordBodyDto } from './change-password.dto';
import type { ChangePasswordRepository } from './change-password.repository';

export class ChangePasswordService extends BaseService<ChangePasswordRepository> {
  async execute(user: AuthUser, input: ChangePasswordBodyDto): Promise<void> {
    const userRow = await this.repo.findUserById(user.id);
    if (!userRow) {
      throw notFound('User not found');
    }

    const validPw = await verifyPassword(input.currentPassword, userRow.passwordHash);
    if (!validPw) {
      throw unauthenticated('Current password is incorrect');
    }

    const newHash = await hashPassword(input.newPassword);
    await this.repo.updatePasswordHash(user.id, newHash, userRow.tokenVersion + 1);
    await this.repo.createAuditLog(user.id);
  }
}
