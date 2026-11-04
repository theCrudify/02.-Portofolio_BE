import { desc } from 'drizzle-orm';
import type { Database } from '../db/client';
import { paginate, type PaginateInput } from '../db/queries/common';
import * as schema from '../db/schema';

const { auditLogs, projects, technologies } = schema;

/** Portfolio content in FK-safe order (master data first). Users, logs and analytics are excluded. */
export const BACKUP_TABLES = {
  lookupGroups: schema.lookupGroups,
  lookups: schema.lookups,
  media: schema.media,
  organizations: schema.organizations,
  profile: schema.profile,
  profileSocials: schema.profileSocials,
  profileLanguages: schema.profileLanguages,
  profileInterests: schema.profileInterests,
  siteSettings: schema.siteSettings,
  siteSections: schema.siteSections,
  technologies: schema.technologies,
  projects: schema.projects,
  projectResponsibilities: schema.projectResponsibilities,
  projectHighlights: schema.projectHighlights,
  projectMetrics: schema.projectMetrics,
  projectTechnologies: schema.projectTechnologies,
  projectLinks: schema.projectLinks,
  projectMedia: schema.projectMedia,
  experiences: schema.experiences,
  experienceResponsibilities: schema.experienceResponsibilities,
  experienceAchievements: schema.experienceAchievements,
  experienceProjects: schema.experienceProjects,
  experienceTechnologies: schema.experienceTechnologies,
  education: schema.education,
  educationActivities: schema.educationActivities,
  certifications: schema.certifications,
  certificationAchievements: schema.certificationAchievements,
  certificationLinks: schema.certificationLinks,
  certificationMedia: schema.certificationMedia,
  certificationTechnologies: schema.certificationTechnologies,
  activities: schema.activities,
  activityAchievements: schema.activityAchievements,
  activityLinks: schema.activityLinks,
  activityMedia: schema.activityMedia,
  activityTechnologies: schema.activityTechnologies,
  achievements: schema.achievements,
  publications: schema.publications,
  testimonials: schema.testimonials,
  documents: schema.documents,
  exportPresets: schema.exportPresets,
  exportPresetSections: schema.exportPresetSections,
  exportPresetTechnologies: schema.exportPresetTechnologies,
};
type BackupTableName = keyof typeof BACKUP_TABLES;

export async function exportBackup(db: Database) {
  const names = Object.keys(BACKUP_TABLES) as BackupTableName[];
  const rows = await Promise.all(names.map((n) => db.select().from(BACKUP_TABLES[n])));
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    tables: Object.fromEntries(names.map((n, i) => [n, rows[i]])) as Record<BackupTableName, unknown[]>,
  };
}

// shortcut: only technologies and projects are restored; other tables are validated and counted only. Extend when a full restore is needed.
export async function importBackup(
  db: Database,
  tables: { technologies?: Record<string, unknown>[]; projects?: Record<string, unknown>[] },
) {
  if (tables.technologies?.length) {
    await db.insert(technologies).values(tables.technologies as (typeof technologies.$inferInsert)[]);
  }
  if (tables.projects?.length) {
    await db.insert(projects).values(tables.projects as (typeof projects.$inferInsert)[]);
  }
  return { technologies: tables.technologies?.length ?? 0, projects: tables.projects?.length ?? 0 };
}

export async function listAuditLogs(db: Database, query: PaginateInput = {}) {
  const { page, limit, offset } = paginate({ page: query.page, limit: query.limit ?? 50 });
  const [rows, total] = await Promise.all([
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset),
    db.$count(auditLogs),
  ]);
  return { rows, meta: { page, limit, total } };
}
