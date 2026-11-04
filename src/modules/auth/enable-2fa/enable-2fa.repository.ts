import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import * as schema from '@/db/schema';

export class Enable2faRepository extends BaseRepository {
  async findUserById(userId: string) {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));
    return rows.find((u) => u.id === userId) ?? null;
  }

  async activateTotp(userId: string): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ totpEnabled: true })
      .where(eq(schema.users.id, userId));
  }

  async createAuditLog(userId: string): Promise<void> {
    await this.db.insert(schema.auditLogs).values({
      userId,
      action: 'settings',
      resource: 'users',
      resourceId: userId,
      summary: 'Enabled 2FA TOTP',
    });
  }
}

