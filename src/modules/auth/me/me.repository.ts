import { selectUsers } from '@/db/queries/users';
import { eq } from 'drizzle-orm';
import { BaseRepository } from '@/core/base';
import * as schema from '@/db/schema';

export class MeRepository extends BaseRepository {
  async findById(userId: string) {
    const [row] = await selectUsers(this.db)
      .where(eq(schema.users.id, userId))
      .limit(1);
    return row ?? null;
  }
}
