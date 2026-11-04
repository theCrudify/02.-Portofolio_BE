import type { WithSql } from '@/db/queries/lookups';
import { BaseRepository } from '@/core/base';
import { media } from '@/db/schema';
import { writeAuditLog } from '@/services/audit.service';

export class EmbedMediaRepository extends BaseRepository {
  async insertMedia(values: WithSql<typeof media.$inferInsert>) {
    const [created] = await this.db.insert(media).values(values).returning();
    return created!;
  }

  async logAudit(entry: Parameters<typeof writeAuditLog>[1]) {
    await writeAuditLog(this.db, entry);
  }
}
