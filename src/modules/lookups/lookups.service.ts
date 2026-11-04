import { and, asc, eq } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { lookupGroups, lookups } from '@/db/schema';
import { AppError, conflict, forbidden, notFound } from '@/lib/errors';
import { revalidate } from '@/lib/revalidate';
import { writeAuditLog } from '@/services/audit.service';
import type { AuthUser, Env } from '@/types/env';
import type { z } from 'zod';
import type { lookupCreateSchema, lookupUpdateSchema } from '@/validators/content';

type CreateDto = z.infer<typeof lookupCreateSchema>;
type UpdateDto = z.infer<typeof lookupUpdateSchema>;

// Labels show up on every public page.
const PUBLIC_TAGS = ['site', 'projects', 'certifications'];

/** All groups with their values (inactive included), in display order. */
export async function listLookupGroups(db: DbClient) {
  const [groups, values] = await Promise.all([
    db.select().from(lookupGroups).orderBy(asc(lookupGroups.code)),
    db.select().from(lookups).orderBy(asc(lookups.sortOrder), asc(lookups.labelEn)),
  ]);
  return groups.map((g) => ({ ...g, values: values.filter((v) => v.groupId === g.id) }));
}

async function getLookup(db: DbClient, id: string) {
  const [row] = await db.select().from(lookups).where(eq(lookups.id, id)).limit(1);
  if (!row) throw notFound('Lookup value not found');
  return row;
}

export async function createLookup(db: DbClient, env: Env, user: AuthUser, dto: CreateDto) {
  const [group] = await db.select().from(lookupGroups).where(eq(lookupGroups.id, dto.groupId)).limit(1);
  if (!group) throw notFound('Lookup group not found');
  // Values of system groups (roles, statuses, sections…) each need code support to work.
  if (group.isSystem) throw forbidden(`Values can't be added to the system group ${group.code}`);
  const [dup] = await db
    .select({ id: lookups.id })
    .from(lookups)
    .where(and(eq(lookups.groupId, dto.groupId), eq(lookups.code, dto.code)))
    .limit(1);
  if (dup) throw conflict(`Code "${dto.code}" already exists in ${group.code}`);

  const [created] = await db.insert(lookups).values({ ...dto, isSystem: false }).returning();
  await writeAuditLog(db, {
    userId: user.id,
    action: 'create',
    resource: 'lookups',
    resourceId: created!.id,
    summary: `Added ${group.code}.${dto.code}`,
  });
  await revalidate(env, PUBLIC_TAGS);
  return created!;
}

export async function updateLookup(db: DbClient, env: Env, user: AuthUser, id: string, dto: UpdateDto) {
  const existing = await getLookup(db, id);
  // A system value drives code paths; hiding it would break them.
  if (existing.isSystem && dto.isActive === false) {
    throw forbidden('System values cannot be deactivated');
  }
  const [updated] = await db
    .update(lookups)
    .set({ ...dto, updatedAt: new Date() })
    .where(eq(lookups.id, id))
    .returning();
  await writeAuditLog(db, {
    userId: user.id,
    action: 'update',
    resource: 'lookups',
    resourceId: id,
    summary: `Updated ${existing.code}`,
  });
  await revalidate(env, PUBLIC_TAGS);
  return updated!;
}

export async function deleteLookup(db: DbClient, env: Env, user: AuthUser, id: string) {
  const existing = await getLookup(db, id);
  if (existing.isSystem) throw forbidden('System values cannot be deleted');
  try {
    await db.delete(lookups).where(eq(lookups.id, id));
  } catch (err) {
    // FKs to lookups are ON DELETE RESTRICT: a value still in use can't go.
    if ((err as { code?: string }).code === '23503' || /foreign key/i.test(String(err))) {
      throw new AppError(409, 'CONFLICT', 'This value is still used; reassign those records first.');
    }
    throw err;
  }
  await writeAuditLog(db, {
    userId: user.id,
    action: 'delete',
    resource: 'lookups',
    resourceId: id,
    summary: `Deleted ${existing.code}`,
  });
  await revalidate(env, PUBLIC_TAGS);
}
