import { and, asc, eq, inArray } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { publishedOnly } from '@/db/queries/common';
import { lk } from '@/db/queries/lookups';
import * as schema from '@/db/schema';
import { fetchContext, type RawContext } from './context.repository';
import { BaseRepository } from './base.repository';

type Row<T extends { $inferSelect: unknown }> = T['$inferSelect'];

export interface RawSiteData {
  context: RawContext;
  profileRows: Row<typeof schema.profile>[];
  socialRows: Row<typeof schema.profileSocials>[];
  languageRows: Row<typeof schema.profileLanguages>[];
  interestRows: Row<typeof schema.profileInterests>[];
  settingsRows: Row<typeof schema.siteSettings>[];
  sectionRows: Row<typeof schema.siteSections>[];
  techRows: Row<typeof schema.technologies>[];
  projectRows: Row<typeof schema.projects>[];
  experienceRows: Row<typeof schema.experiences>[];
  educationRows: Row<typeof schema.education>[];
  certRows: Row<typeof schema.certifications>[];
  activityRows: Row<typeof schema.activities>[];
  achievementRows: Row<typeof schema.achievements>[];
  publicationRows: Row<typeof schema.publications>[];
  testimonialRows: Row<typeof schema.testimonials>[];
  githubRows: Row<typeof schema.githubCache>[];
  presetRows: Row<typeof schema.exportPresets>[];
  projTechRows: Row<typeof schema.projectTechnologies>[];
  projLinkRows: Row<typeof schema.projectLinks>[];
  projClipRows: Row<typeof schema.projectMedia>[];
  projMetricRows: Row<typeof schema.projectMetrics>[];
  projResponsibilityRows: Row<typeof schema.projectResponsibilities>[];
  expTechRows: Row<typeof schema.experienceTechnologies>[];
  expResponsibilityRows: Row<typeof schema.experienceResponsibilities>[];
  expAchievementRows: Row<typeof schema.experienceAchievements>[];
  expProjectRows: Row<typeof schema.experienceProjects>[];
  eduActivityRows: Row<typeof schema.educationActivities>[];
  activityAchievementRows: Row<typeof schema.activityAchievements>[];
}

export interface ISiteRepository {
  fetchSiteAggregate(): Promise<RawSiteData>;
}

const ordered = <T extends { sortOrder: unknown }>(t: T) => asc(t.sortOrder as never);

export class DrizzleSiteRepository extends BaseRepository implements ISiteRepository {
  constructor(db: DbClient) {
    super(db);
  }

  async fetchSiteAggregate(): Promise<RawSiteData> {
    const db = this.db;
    const [
      context,
      profileRows,
      socialRows,
      languageRows,
      interestRows,
      settingsRows,
      sectionRows,
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
      presetRows,
    ] = await Promise.all([
      fetchContext(db),
      db.select().from(schema.profile).where(eq(schema.profile.id, 1)),
      db.select().from(schema.profileSocials),
      db.select().from(schema.profileLanguages),
      db.select().from(schema.profileInterests),
      db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)),
      db.select().from(schema.siteSections),
      db.select().from(schema.technologies).where(publishedOnly(schema.technologies)).orderBy(ordered(schema.technologies)),
      db.select().from(schema.projects).where(publishedOnly(schema.projects)).orderBy(ordered(schema.projects)),
      db.select().from(schema.experiences).where(publishedOnly(schema.experiences)).orderBy(ordered(schema.experiences)),
      db.select().from(schema.education).where(publishedOnly(schema.education)).orderBy(ordered(schema.education)),
      db.select().from(schema.certifications).where(publishedOnly(schema.certifications)).orderBy(ordered(schema.certifications)),
      db.select().from(schema.activities).where(publishedOnly(schema.activities)).orderBy(ordered(schema.activities)),
      db.select().from(schema.achievements).where(publishedOnly(schema.achievements)).orderBy(ordered(schema.achievements)),
      db.select().from(schema.publications).where(publishedOnly(schema.publications)).orderBy(ordered(schema.publications)),
      db.select().from(schema.testimonials).where(publishedOnly(schema.testimonials)).orderBy(ordered(schema.testimonials)),
      db.select().from(schema.githubCache).where(eq(schema.githubCache.key, 'stats')),
      db
        .select()
        .from(schema.exportPresets)
        .where(eq(schema.exportPresets.isPublic, true))
        .orderBy(asc(schema.exportPresets.sortOrder)),
    ]);

    // Relations for every published project: the CV export needs all of them, and the data is small.
    const projectIds = projectRows.map((p) => p.id);
    const experienceIds = experienceRows.map((e) => e.id);
    const educationIds = educationRows.map((e) => e.id);
    const activityIds = activityRows.map((a) => a.id);
    const none = Promise.resolve([]);

    const [
      projTechRows,
      projLinkRows,
      projClipRows,
      projMetricRows,
      projResponsibilityRows,
      expTechRows,
      expResponsibilityRows,
      expAchievementRows,
      expProjectRows,
      eduActivityRows,
      activityAchievementRows,
    ] = await Promise.all([
      projectIds.length
        ? db.select().from(schema.projectTechnologies).where(inArray(schema.projectTechnologies.projectId, projectIds))
        : none,
      projectIds.length
        ? db.select().from(schema.projectLinks).where(inArray(schema.projectLinks.projectId, projectIds))
        : none,
      projectIds.length
        ? db
            .select()
            .from(schema.projectMedia)
            .where(
              and(
                inArray(schema.projectMedia.projectId, projectIds),
                eq(schema.projectMedia.roleId, lk('project_media_role', 'clip')),
              ),
            )
        : none,
      projectIds.length
        ? db.select().from(schema.projectMetrics).where(inArray(schema.projectMetrics.projectId, projectIds))
        : none,
      projectIds.length
        ? db.select().from(schema.projectResponsibilities).where(inArray(schema.projectResponsibilities.projectId, projectIds))
        : none,
      experienceIds.length
        ? db.select().from(schema.experienceTechnologies).where(inArray(schema.experienceTechnologies.experienceId, experienceIds))
        : none,
      experienceIds.length
        ? db.select().from(schema.experienceResponsibilities).where(inArray(schema.experienceResponsibilities.experienceId, experienceIds))
        : none,
      experienceIds.length
        ? db.select().from(schema.experienceAchievements).where(inArray(schema.experienceAchievements.experienceId, experienceIds))
        : none,
      experienceIds.length
        ? db.select().from(schema.experienceProjects).where(inArray(schema.experienceProjects.experienceId, experienceIds))
        : none,
      educationIds.length
        ? db.select().from(schema.educationActivities).where(inArray(schema.educationActivities.educationId, educationIds))
        : none,
      activityIds.length
        ? db.select().from(schema.activityAchievements).where(inArray(schema.activityAchievements.activityId, activityIds))
        : none,
    ]);

    return {
      context,
      profileRows,
      socialRows,
      languageRows,
      interestRows,
      settingsRows,
      sectionRows,
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
      presetRows,
      projTechRows,
      projLinkRows,
      projClipRows,
      projMetricRows,
      projResponsibilityRows,
      expTechRows,
      expResponsibilityRows,
      expAchievementRows,
      expProjectRows,
      eduActivityRows,
      activityAchievementRows,
    };
  }
}
