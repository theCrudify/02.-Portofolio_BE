import { selectUsers } from '@/db/queries/users';
import { lk } from '@/db/queries/lookups';
import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import * as schema from '@/db/schema';
import type { UserRole } from '@/types/env';

export class UpdateUserRepository extends BaseRepository {
  async findAllUsers() {
    return selectUsers(this.db);
  }

  async updateUser(
    targetId: string,
    patch: { name?: string; role?: UserRole; isActive?: boolean; tokenVersion: number },
  ): Promise<void> {
    await this.db
      .update(schema.users)
      .set({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.role !== undefined ? { roleId: lk('user_role', patch.role) } : {}),
        ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
        tokenVersion: patch.tokenVersion,
      })
      .where(eq(schema.users.id, targetId));
  }

  async createAuditLog(actorId: string, targetId: string, email: string): Promise<void> {
    await this.db.insert(schema.auditLogs).values({
      userId: actorId,
      actionId: lk('audit_action', 'update'),
      resource: 'users',
      resourceId: targetId,
      summary: `Updated user ${email}`,
    });
  }
}
