import { BaseService } from '@/core/base';
import { conflict } from '@/lib/errors';
import { hashPassword } from '@/lib/password';
import type { AuthUser, UserRole } from '@/types/env';
import type { CreateUserRepository } from './create.repository';

function generateInitialPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let pw = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    pw += chars[(bytes[i] ?? 0) % chars.length];
  }
  return pw;
}

export class CreateUserService extends BaseService<CreateUserRepository> {
  async execute(
    actor: AuthUser,
    input: { email: string; name: string; role: UserRole; password?: string },
  ) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await this.repo.findAllUsers();
    if (existing.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw conflict('Email is already registered');
    }

    const initialPassword = input.password ?? generateInitialPassword();
    const passwordHash = await hashPassword(initialPassword);

    const created = await this.repo.insertUser({
      email: normalizedEmail,
      name: input.name,
      role: input.role,
      passwordHash,
    });

    await this.repo.createAuditLog(actor.id, created.id, created.email, input.role);

    return {
      user: {
        id: created.id,
        email: created.email,
        name: created.name,
        role: input.role,
        isActive: created.isActive,
      },
      initialPassword,
    };
  }
}
