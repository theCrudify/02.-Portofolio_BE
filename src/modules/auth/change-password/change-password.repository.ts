import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import * as schema from '@/db/schema';

export class ChangePasswordRepository extends BaseRepository {
  async findUserById(userId: string) {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));
    return rows.find((u) => u.id === userId) ?? null;
  }

  async updatePasswordHash(userId: string, passwordHash: string, nextTokenVersion: number): Promise<void> {
    await this.db
      .update(schema.users)
      .set({
        passwordHash,
        tokenVersion: nextTokenVersion,
      })
      .where(eq(schema.users.id, userId));
  }

  async createAuditLog(userId: string): Promise<void> {
    await this.db.insert(schema.auditLogs).values({
      userId,
      action: 'settings',
      resource: 'users',
      resourceId: userId,
      summary: 'Changed account password',
    });
  }
}
