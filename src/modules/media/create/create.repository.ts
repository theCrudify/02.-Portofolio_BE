import { BaseRepository } from '@/core/base';
import { media } from '@/db/schema';
import { writeAuditLog } from '@/services/content.service';

export class CreateMediaRepository extends BaseRepository {
  async insertMedia(values: typeof media.$inferInsert) {
    const [created] = await this.db.insert(media).values(values).returning();
    return created!;
  }

  async logAudit(entry: Parameters<typeof writeAuditLog>[1]) {
    await writeAuditLog(this.db, entry);
  }
}
