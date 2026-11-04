import { z } from '@hono/zod-openapi';
import { booleanQueryParam } from '@/core/query';

export const importBackupQuerySchema = z.object({
  dryRun: booleanQueryParam,
});

export const importBackupBodySchema = z.object({
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

export type ImportBackupBodyDto = z.infer<typeof importBackupBodySchema>;
