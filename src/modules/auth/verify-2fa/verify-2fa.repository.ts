import { selectUsers } from '@/db/queries/users';
import { lk } from '@/db/queries/lookups';
import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import * as schema from '@/db/schema';

export class Verify2faRepository extends BaseRepository {
  async findUserById(userId: string) {
    const rows = await selectUsers(this.db)
      .where(eq(schema.users.id, userId));
    return rows.find((u) => u.id === userId) ?? null;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.users.id, userId));
  }

  async createAuditLog(userId: string, userName: string): Promise<void> {
    await this.db.insert(schema.auditLogs).values({
      userId,
      actionId: lk('audit_action', 'login'),
      resource: 'auth',
      resourceId: userId,
      summary: `User ${userName} logged in with 2FA`,
    });
  }
}

