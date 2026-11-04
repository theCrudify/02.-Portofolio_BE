import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import * as schema from '@/db/schema';

export class LogoutRepository extends BaseRepository {
  async incrementTokenVersion(userId: string, nextVersion: number): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ tokenVersion: nextVersion })
      .where(eq(schema.users.id, userId));
  }

  async createAuditLog(userId: string, summary: string): Promise<void> {
    await this.db.insert(schema.auditLogs).values({
      userId,
      action: 'logout',
      resource: 'auth',
      resourceId: userId,
      summary,
    });
  }
}
