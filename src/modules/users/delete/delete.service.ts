import { BaseService } from '@/core/base';
import { forbidden, notFound } from '@/lib/errors';
import type { AuthUser } from '@/types/env';
import type { DeleteUserRepository } from './delete.repository';

export class DeleteUserService extends BaseService<DeleteUserRepository> {
  async execute(actor: AuthUser, targetId: string): Promise<void> {
    if (actor.id === targetId) {
      throw forbidden('Cannot delete your own account');
    }

    const allUsers = await this.repo.findAllUsers();
    const target = allUsers.find((u) => u.id === targetId);
    if (!target) {
      throw notFound('User not found');
    }

    const activeOwners = allUsers.filter((u) => u.role === 'owner' && u.isActive);
    if (target.role === 'owner' && target.isActive && activeOwners.length <= 1) {
      throw forbidden('At least one active owner account is required');
    }

    await this.repo.removeById(targetId);
    await this.repo.createAuditLog(actor.id, targetId, target.email);
  }
}
