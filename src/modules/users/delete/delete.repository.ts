import { selectUsers } from '@/db/queries/users';
import { lk } from '@/db/queries/lookups';
import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import * as schema from '@/db/schema';

export class DeleteUserRepository extends BaseRepository {
  async findAllUsers() {
    return selectUsers(this.db);
  }

  async removeById(targetId: string): Promise<void> {
    await this.db.delete(schema.users).where(eq(schema.users.id, targetId));
  }

  async createAuditLog(actorId: string, targetId: string, email: string): Promise<void> {
    await this.db.insert(schema.auditLogs).values({
      userId: actorId,
      actionId: lk('audit_action', 'delete'),
      resource: 'users',
      resourceId: targetId,
      summary: `Deleted user ${email}`,
    });
  }
}
