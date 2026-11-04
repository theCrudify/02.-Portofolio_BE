import { eq, getTableColumns, sql } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { lookups, users } from '@/db/schema';
import type { UserRole } from '@/types/env';

/** Users with their role code (from the user_role lookup) next to the row columns. */
export function selectUsers(db: DbClient) {
  return db
    .select({ ...getTableColumns(users), role: sql<UserRole>`${lookups.code}` })
    .from(users)
    .innerJoin(lookups, eq(lookups.id, users.roleId));
}

export type UserWithRole = Awaited<ReturnType<typeof selectUsers>>[number];
