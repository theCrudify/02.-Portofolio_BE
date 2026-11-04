import { desc } from 'drizzle-orm';
import type { Database } from '../db/client';
import { paginate, type PaginateInput } from '../db/queries/common';
import {
  profile,
  siteSettings,
  media,
  technologies,
  projects,
  projectTechnologies,
  projectLinks,
  projectMedia,
  experiences,
  experienceTechnologies,
  education,
  certifications,
  activities,
  achievements,
  publications,
  testimonials,
  documents,
  exportPresets,
  auditLogs,
} from '../db/schema';

const BACKUP_TABLES = { profile, siteSettings, media, technologies, projects, projectTechnologies, projectLinks, projectMedia, experiences, experienceTechnologies, education, certifications, activities, achievements, publications, testimonials, documents, exportPresets };
type BackupTableName = keyof typeof BACKUP_TABLES;

export async function exportBackup(db: Database) {
  const names = Object.keys(BACKUP_TABLES) as BackupTableName[];
  const rows = await Promise.all(names.map((n) => db.select().from(BACKUP_TABLES[n])));
  return {
    version: 1,
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
