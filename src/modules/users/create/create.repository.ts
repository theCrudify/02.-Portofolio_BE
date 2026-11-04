import { selectUsers } from '@/db/queries/users';
import { lk } from '@/db/queries/lookups';
import { BaseRepository } from '@/core/base';
import * as schema from '@/db/schema';
import type { UserRole } from '@/types/env';

export class CreateUserRepository extends BaseRepository {
  async findAllUsers() {
    return selectUsers(this.db);
  }

  async insertUser(values: {
    email: string;
    name: string;
    role: UserRole;
    passwordHash: string;
  }) {
    const inserted = await this.db
      .insert(schema.users)
      .values({
        email: values.email,
        name: values.name,
        passwordHash: values.passwordHash,
        roleId: lk('user_role', values.role),
        isActive: true,
      })
      .returning();
    return inserted[0]!;
  }

  async createAuditLog(actorId: string, createdId: string, email: string, role: string): Promise<void> {
    await this.db.insert(schema.auditLogs).values({
      userId: actorId,
      actionId: lk('audit_action', 'create'),
      resource: 'users',
      resourceId: createdId,
      summary: `Created user ${email} (${role})`,
    });
  }
}
