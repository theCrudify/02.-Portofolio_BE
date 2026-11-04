import { selectUsers } from '@/db/queries/users';
import { lk } from '@/db/queries/lookups';
import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import * as schema from '@/db/schema';

export class Disable2faRepository extends BaseRepository {
  async findUserById(userId: string) {
    const rows = await selectUsers(this.db)
      .where(eq(schema.users.id, userId));
    return rows.find((u) => u.id === userId) ?? null;
  }

  async clearTotp(userId: string): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ totpEnabled: false, totpSecret: null })
      .where(eq(schema.users.id, userId));
  }

  async createAuditLog(userId: string): Promise<void> {
    await this.db.insert(schema.auditLogs).values({
      userId,
      actionId: lk('audit_action', 'settings'),
      resource: 'users',
      resourceId: userId,
      summary: 'Disabled 2FA TOTP',
    });
  }
}
