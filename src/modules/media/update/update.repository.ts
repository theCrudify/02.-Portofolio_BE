import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import { media } from '@/db/schema';
import { writeAuditLog } from '@/services/audit.service';
import type { UpdateMediaBodyDto } from './update.dto';

export class UpdateMediaRepository extends BaseRepository {
  async updateById(id: string, patch: UpdateMediaBodyDto) {
    const [updated] = await this.db
      .update(media)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(media.id, id))
      .returning();
    return updated ?? null;
  }

  async logAudit(entry: Parameters<typeof writeAuditLog>[1]) {
    await writeAuditLog(this.db, entry);
  }
}
