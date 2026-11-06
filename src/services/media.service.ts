import { and, desc, eq, isNull, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { Database } from '../db/client';
import { paginate, type PaginateInput } from '../db/queries/common';
import { lk } from '../db/queries/lookups';
import {
  achievements,
  activities,
  certifications,
  documents,
  experienceMedia,
  media,
  organizations,
  profile,
  projectMedia,
  projects,
  publications,
  siteSettings,
  testimonials,
} from '../db/schema';


// Every column that can point at a media row; `id` is what we report back as the referencing record.
const MEDIA_REFERENCES: Array<{
  resource: string;
  table: PgTable;
  id: PgColumn;
  column: PgColumn;
  deletedAt?: PgColumn;
}> = [
  { resource: 'profile', table: profile, id: profile.id, column: profile.avatarMediaId },
  { resource: 'site_settings', table: siteSettings, id: siteSettings.id, column: siteSettings.ogMediaId },
  { resource: 'projects', table: projects, id: projects.id, column: projects.coverMediaId, deletedAt: projects.deletedAt },
  { resource: 'projects', table: projects, id: projects.id, column: projects.architectureMediaId, deletedAt: projects.deletedAt },
  { resource: 'project_media', table: projectMedia, id: projectMedia.projectId, column: projectMedia.mediaId },
  { resource: 'experience_media', table: experienceMedia, id: experienceMedia.parentId, column: experienceMedia.mediaId },
  { resource: 'organizations', table: organizations, id: organizations.id, column: organizations.logoMediaId, deletedAt: organizations.deletedAt },
  { resource: 'certifications', table: certifications, id: certifications.id, column: certifications.imageMediaId, deletedAt: certifications.deletedAt },
  { resource: 'activities', table: activities, id: activities.id, column: activities.mediaId, deletedAt: activities.deletedAt },
  { resource: 'achievements', table: achievements, id: achievements.id, column: achievements.certificateMediaId, deletedAt: achievements.deletedAt },
  { resource: 'publications', table: publications, id: publications.id, column: publications.videoMediaId, deletedAt: publications.deletedAt },
  { resource: 'testimonials', table: testimonials, id: testimonials.id, column: testimonials.avatarMediaId, deletedAt: testimonials.deletedAt },
  { resource: 'documents', table: documents, id: documents.id, column: documents.mediaId },
];

export async function findMediaUsages(db: Database, mediaId: string) {
  const results = await Promise.all(
    MEDIA_REFERENCES.map(({ table, id, column, deletedAt }) =>
      db
        .select({ id })
        .from(table)
        .where(deletedAt ? and(eq(column, mediaId), isNull(deletedAt)) : eq(column, mediaId)),
    ),
  );
  return results.flatMap((rows, i) =>
    rows.map((r) => ({ resource: MEDIA_REFERENCES[i]!.resource, id: String(r.id) })),
  );
}

export async function createMedia(db: Database, values: typeof media.$inferInsert) {
  const [created] = await db.insert(media).values(values).returning();
  return created!;
}

export async function listMedia(db: Database, query: PaginateInput & { kind?: string }) {
  const { page, limit, offset } = paginate({ page: query.page, limit: query.limit ?? 50 });
  const conds: SQL[] = [isNull(media.deletedAt)];
  if (query.kind) conds.push(eq(media.kindId, lk('media_kind', query.kind)));
  const where = and(...conds);
  const [rows, total] = await Promise.all([
    db.select().from(media).where(where).orderBy(desc(media.createdAt)).limit(limit).offset(offset),
    db.$count(media, where),
  ]);
  return { rows, meta: { page, limit, total } };
}

export async function getMedia(db: Database, id: string) {
  const [row] = await db
    .select()
    .from(media)
    .where(and(eq(media.id, id), isNull(media.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function updateMedia(
  db: Database,
  id: string,
  patch: Partial<Pick<typeof media.$inferInsert, 'titleEn' | 'titleId' | 'altEn' | 'altId' | 'captionsUrl'>>,
) {
  const [updated] = await db
    .update(media)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(media.id, id))
    .returning();
  return updated ?? null;
}

export async function softDeleteMedia(db: Database, id: string) {
  const [deleted] = await db
    .update(media)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(media.id, id), isNull(media.deletedAt)))
    .returning({ id: media.id });
  return Boolean(deleted);
}
