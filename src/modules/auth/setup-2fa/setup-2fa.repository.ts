import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import * as schema from '@/db/schema';

export class Setup2faRepository extends BaseRepository {
  async savePendingTotpSecret(userId: string, encryptedSecret: string): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ totpSecret: encryptedSecret, totpEnabled: false })
      .where(eq(schema.users.id, userId));
  }
}

