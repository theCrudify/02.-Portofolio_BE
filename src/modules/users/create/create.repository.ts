import { BaseRepository } from '@/core/base';
import * as schema from '@/db/schema';
import type { UserRole } from '@/types/env';

export class CreateUserRepository extends BaseRepository {
  async findAllUsers() {
    return this.db.select().from(schema.users);
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
        ...values,
        isActive: true,
      })
      .returning();
    return inserted[0]!;
  }

  async createAuditLog(actorId: string, createdId: string, email: string, role: string): Promise<void> {
    await this.db.insert(schema.auditLogs).values({
      userId: actorId,
      action: 'create',
      resource: 'users',
      resourceId: createdId,
      summary: `Created user ${email} (${role})`,
    });
  }
}
