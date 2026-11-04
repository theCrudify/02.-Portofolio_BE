import { and, eq, isNull } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import { media } from '@/db/schema';

export class DetailMediaRepository extends BaseRepository {
  async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(media)
      .where(and(eq(media.id, id), isNull(media.deletedAt)))
      .limit(1);
    return row ?? null;
  }
}
