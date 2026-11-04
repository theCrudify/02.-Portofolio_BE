import { OpenAPIHono } from '@hono/zod-openapi';
import { desc } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/client';
import {
  profile,
  siteSettings,
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
  media,
  auditLogs,
} from '../../db/schema';
import { AppError } from '../../lib/errors';
import { revalidate } from '../../lib/revalidate';
import { ok } from '../../lib/response';
import { requireRole } from '../../middleware/require-role';
import { writeAuditLog } from '../../services/content.service';
import type { AppBindings } from '../../types/env';

const backupBundleSchema = z.object({
  version: z.number().int().default(1),
  exportedAt: z.string().optional(),
  tables: z.object({
    profile: z.array(z.record(z.unknown())).optional(),
    siteSettings: z.array(z.record(z.unknown())).optional(),
    media: z.array(z.record(z.unknown())).optional(),
    technologies: z.array(z.record(z.unknown())).optional(),
    projects: z.array(z.record(z.unknown())).optional(),
    projectTechnologies: z.array(z.record(z.unknown())).optional(),
    projectLinks: z.array(z.record(z.unknown())).optional(),
    projectMedia: z.array(z.record(z.unknown())).optional(),
    experiences: z.array(z.record(z.unknown())).optional(),
    experienceTechnologies: z.array(z.record(z.unknown())).optional(),
    education: z.array(z.record(z.unknown())).optional(),
    certifications: z.array(z.record(z.unknown())).optional(),
    activities: z.array(z.record(z.unknown())).optional(),
    achievements: z.array(z.record(z.unknown())).optional(),
    publications: z.array(z.record(z.unknown())).optional(),
    testimonials: z.array(z.record(z.unknown())).optional(),
    documents: z.array(z.record(z.unknown())).optional(),
    exportPresets: z.array(z.record(z.unknown())).optional(),
  }),
});

const adminSystem = new OpenAPIHono<AppBindings>();

adminSystem.get('/v1/admin/backup/export', requireRole('owner'), async (c) => {
  const db = getDb(c.env);
  const bundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: {
      profile: await db.select().from(profile),
      siteSettings: await db.select().from(siteSettings),
      media: await db.select().from(media),
      technologies: await db.select().from(technologies),
      projects: await db.select().from(projects),
      projectTechnologies: await db.select().from(projectTechnologies),
      projectLinks: await db.select().from(projectLinks),
      projectMedia: await db.select().from(projectMedia),
      experiences: await db.select().from(experiences),
      experienceTechnologies: await db.select().from(experienceTechnologies),
      education: await db.select().from(education),
      certifications: await db.select().from(certifications),
      activities: await db.select().from(activities),
      achievements: await db.select().from(achievements),
      publications: await db.select().from(publications),
      testimonials: await db.select().from(testimonials),
      documents: await db.select().from(documents),
      exportPresets: await db.select().from(exportPresets),
    },
  };

  return ok(c, bundle);
});

adminSystem.post('/v1/admin/backup/import', requireRole('owner'), async (c) => {
  const dryRun = c.req.query('dryRun') === 'true';
  const body = await c.req.json();
  const parsed = backupBundleSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Invalid backup bundle format',
      parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    );
  }

  const tables = parsed.data.tables;
  const counts: Record<string, number> = {};
  for (const [k, rows] of Object.entries(tables)) {
    counts[k] = Array.isArray(rows) ? rows.length : 0;
  }

  if (dryRun) {
    return ok(c, { dryRun: true, valid: true, counts });
  }

  const db = getDb(c.env);
  const user = c.get('user')!;

  if (tables.technologies && tables.technologies.length > 0) {
    await db
      .insert(technologies)
      .values(tables.technologies as (typeof technologies.$inferInsert)[]);
  }
  if (tables.projects && tables.projects.length > 0) {
    await db.insert(projects).values(tables.projects as (typeof projects.$inferInsert)[]);
  }

  await writeAuditLog(db, {
    userId: user.id,
    action: 'import',
    resource: 'backup',
    summary: `Imported JSON backup bundle`,
  });

  await revalidate(c.env, ['site', 'projects', 'certifications', 'documents']);
  return ok(c, { dryRun: false, imported: true, counts });
});

adminSystem.get('/v1/admin/audit-logs', requireRole('owner'), async (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 50)));
  const offset = (page - 1) * limit;

  const db = getDb(c.env);
  const rows = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return ok(c, rows, { page, limit, total: rows.length });
});

export default adminSystem;

