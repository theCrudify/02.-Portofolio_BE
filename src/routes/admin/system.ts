import { OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { getDb } from '../../db/client';
import { AppError } from '../../lib/errors';
import { revalidate } from '../../lib/revalidate';
import { ok } from '../../lib/response';
import { requireRole } from '../../middleware/require-role';
import { writeAuditLog } from '../../services/content.service';
import { exportBackup, importBackup, listAuditLogs } from '../../services/system.service';
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
  return ok(c, await exportBackup(getDb(c.env)));
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
  const imported = await importBackup(db, tables);

  await writeAuditLog(db, {
    userId: user.id,
    action: 'import',
    resource: 'backup',
    summary: `Imported JSON backup bundle`,
  });

  await revalidate(c.env, ['site', 'projects', 'certifications', 'documents']);
  // `counts` = rows found in the bundle; `imported` = rows actually restored.
  return ok(c, { dryRun: false, imported: true, counts, restored: imported });
});

adminSystem.get('/v1/admin/audit-logs', requireRole('owner'), async (c) => {
  const { rows, meta } = await listAuditLogs(getDb(c.env), {
    page: Number(c.req.query('page') ?? 1),
    limit: Number(c.req.query('limit') ?? 50),
  });
  return ok(c, rows, meta);
});

export default adminSystem;
