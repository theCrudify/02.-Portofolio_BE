import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { publishedOnly } from '@/db/queries/common';
import * as schema from '@/db/schema';
import { BaseRepository } from './base.repository';

export interface RawSiteData {
  profileRows: (typeof schema.profile.$inferSelect)[];
  settingsRows: (typeof schema.siteSettings.$inferSelect)[];
  techRows: (typeof schema.technologies.$inferSelect)[];
  projectRows: (typeof schema.projects.$inferSelect)[];
  experienceRows: (typeof schema.experiences.$inferSelect)[];
  educationRows: (typeof schema.education.$inferSelect)[];
  certRows: (typeof schema.certifications.$inferSelect)[];
  activityRows: (typeof schema.activities.$inferSelect)[];
  achievementRows: (typeof schema.achievements.$inferSelect)[];
  publicationRows: (typeof schema.publications.$inferSelect)[];
  testimonialRows: (typeof schema.testimonials.$inferSelect)[];
  githubRows: (typeof schema.githubCache.$inferSelect)[];
  projTechRows: (typeof schema.projectTechnologies.$inferSelect)[];
  projLinkRows: (typeof schema.projectLinks.$inferSelect)[];
  projMediaRows: (typeof schema.projectMedia.$inferSelect)[];
  expTechRows: (typeof schema.experienceTechnologies.$inferSelect)[];
  allMediaRows: (typeof schema.media.$inferSelect)[];
}

export interface ISiteRepository {
  fetchSiteAggregate(): Promise<RawSiteData>;
}

export class DrizzleSiteRepository extends BaseRepository implements ISiteRepository {
  constructor(db: DbClient) {
    super(db);
  }

  async fetchSiteAggregate(): Promise<RawSiteData> {
    const [
      profileRows,
      settingsRows,
      techRows,
      projectRows,
      experienceRows,
      educationRows,
      certRows,
      activityRows,
      achievementRows,
      publicationRows,
      testimonialRows,
      githubRows,
    ] = await Promise.all([
      this.db.select().from(schema.profile).where(eq(schema.profile.id, 1)),
      this.db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)),
      this.db
        .select()
        .from(schema.technologies)
        .where(publishedOnly(schema.technologies))
        .orderBy(asc(schema.technologies.sortOrder)),
      this.db
        .select()
        .from(schema.projects)
        .where(publishedOnly(schema.projects))
        .orderBy(asc(schema.projects.sortOrder)),
      this.db
        .select()
        .from(schema.experiences)
        .where(publishedOnly(schema.experiences))
        .orderBy(asc(schema.experiences.sortOrder)),
      this.db
        .select()
        .from(schema.education)
        .where(publishedOnly(schema.education))
        .orderBy(asc(schema.education.sortOrder)),
      this.db
        .select()
        .from(schema.certifications)
        .where(publishedOnly(schema.certifications))
        .orderBy(asc(schema.certifications.sortOrder)),
      this.db
        .select()
        .from(schema.activities)
        .where(publishedOnly(schema.activities))
        .orderBy(asc(schema.activities.sortOrder)),
      this.db
        .select()
        .from(schema.achievements)
        .where(publishedOnly(schema.achievements))
        .orderBy(asc(schema.achievements.sortOrder)),
      this.db
        .select()
        .from(schema.publications)
        .where(publishedOnly(schema.publications))
        .orderBy(asc(schema.publications.sortOrder)),
      this.db
        .select()
        .from(schema.testimonials)
        .where(publishedOnly(schema.testimonials))
        .orderBy(asc(schema.testimonials.sortOrder)),
      this.db.select().from(schema.githubCache).where(eq(schema.githubCache.key, 'stats')),
    ]);

    const featuredProjectRows = projectRows.filter((p) => p.featured).slice(0, 6);
    const featuredProjectIds = featuredProjectRows.map((p) => p.id);
    const experienceIds = experienceRows.map((e) => e.id);

    const [projTechRows, projLinkRows, projMediaRows, expTechRows, allMediaRows] =
      await Promise.all([
        featuredProjectIds.length > 0
          ? this.db
              .select()
              .from(schema.projectTechnologies)
              .where(inArray(schema.projectTechnologies.projectId, featuredProjectIds))
          : Promise.resolve([]),
        featuredProjectIds.length > 0
          ? this.db
              .select()
              .from(schema.projectLinks)
              .where(inArray(schema.projectLinks.projectId, featuredProjectIds))
          : Promise.resolve([]),
        featuredProjectIds.length > 0
          ? this.db
              .select()
              .from(schema.projectMedia)
              .where(
                and(
                  inArray(schema.projectMedia.projectId, featuredProjectIds),
                  eq(schema.projectMedia.role, 'clip'),
                ),
              )
          : Promise.resolve([]),
        experienceIds.length > 0
          ? this.db
              .select()
              .from(schema.experienceTechnologies)
              .where(inArray(schema.experienceTechnologies.experienceId, experienceIds))
          : Promise.resolve([]),
        this.db.select().from(schema.media).where(isNull(schema.media.deletedAt)),
      ]);

    return {
      profileRows,
      settingsRows,
      techRows,
      projectRows,
      experienceRows,
      educationRows,
      certRows,
      activityRows,
      achievementRows,
      publicationRows,
      testimonialRows,
      githubRows,
      projTechRows,
      projLinkRows,
      projMediaRows,
      expTechRows,
      allMediaRows,
    };
  }
}
