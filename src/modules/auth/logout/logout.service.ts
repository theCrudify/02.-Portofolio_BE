import { BaseService } from '@/core/base';
import type { AuthUser } from '@/types/env';
import type { LogoutRepository } from './logout.repository';

export class LogoutService extends BaseService<LogoutRepository> {
  async logoutSingle(user: AuthUser): Promise<void> {
    await this.repo.createAuditLog(user.id, `User ${user.name} logged out`);
  }

  async logoutAllDevices(user: AuthUser): Promise<void> {
    await this.repo.incrementTokenVersion(user.id, user.tokenVersion + 1);
    await this.repo.createAuditLog(user.id, 'Logged out of all devices');
  }
}
