import { BaseService } from '@/core/base';
import { forbidden, notFound } from '@/lib/errors';
import type { AuthUser, UserRole } from '@/types/env';
import type { UpdateUserRepository } from './update.repository';

export class UpdateUserService extends BaseService<UpdateUserRepository> {
  async execute(
    actor: AuthUser,
    targetId: string,
    input: { name?: string; role?: UserRole; isActive?: boolean },
  ) {
    const allUsers = await this.repo.findAllUsers();
    const target = allUsers.find((u) => u.id === targetId);
    if (!target) {
      throw notFound('User not found');
    }

    if (actor.id === targetId) {
      if (input.isActive === false) {
        throw forbidden('Cannot deactivate your own account');
      }
      if (input.role && input.role !== target.role) {
        throw forbidden('Cannot change your own role');
      }
    }

    const activeOwners = allUsers.filter((u) => u.role === 'owner' && u.isActive);
    if (
      target.role === 'owner' &&
      target.isActive &&
      activeOwners.length <= 1 &&
      ((input.role !== undefined && input.role !== 'owner') || input.isActive === false)
    ) {
      throw forbidden('At least one active owner account is required');
    }

    const nextTokenVersion =
      input.role !== undefined || input.isActive === false
        ? target.tokenVersion + 1
        : target.tokenVersion;

    await this.repo.updateUser(targetId, {
      ...input,
      tokenVersion: nextTokenVersion,
    });

    await this.repo.createAuditLog(actor.id, targetId, target.email);

    return {
      id: target.id,
      email: target.email,
      name: input.name ?? target.name,
      role: input.role ?? target.role,
      isActive: input.isActive ?? target.isActive,
    };
  }
}
