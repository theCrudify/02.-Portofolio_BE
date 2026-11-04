import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Database } from '../db/client';
import {
  profile,
  projects,
  experiences,
  education,
  certifications,
  technologies,
  activities,
  achievements,
  publications,
} from '../db/schema';
import { pickLocale } from '../lib/locale';

export interface ExportPresetRow {
  id: string;
  slug: string;
  name: string;
  template: 'full' | 'one_page' | 'ats';
  locale: 'en' | 'id';
  sections: { key: string; limit?: number }[];
  itemFilter: {
    featuredOnly?: boolean;
    sinceYears?: number;
    technologyIds?: string[];
  };
  isPublic: boolean;
}

export async function buildExport(
  db: Database,
  preset: ExportPresetRow,
  localeOverride?: 'en' | 'id'
) {
  const loc = localeOverride ?? preset.locale ?? 'en';
  const filter = preset.itemFilter ?? {};
  const cutoffDateStr = filter.sinceYears
    ? new Date(Date.now() - filter.sinceYears * 365.25 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
    : null;

  const [profRow] = await db.select().from(profile).where(eq(profile.id, 1)).limit(1);

  const sectionData: Record<string, unknown> = {};

  for (const sec of preset.sections) {
    const limit = sec.limit ?? 50;

    if (sec.key === 'projects') {
      let rows = await db
        .select()
        .from(projects)
        .where(and(eq(projects.status, 'published'), isNull(projects.deletedAt)))
        .orderBy(asc(projects.sortOrder));

      if (filter.featuredOnly) {
        rows = rows.filter((r) => r.featured);
      }
      if (cutoffDateStr) {
        rows = rows.filter((r) => !r.periodStart || r.periodStart >= cutoffDateStr);
      }
      sectionData.projects = rows.slice(0, limit).map((r) => ({
        id: r.id,
        slug: r.slug,
        title: pickLocale(r, 'title', loc),
        summary: pickLocale(r, 'summary', loc),
        role: r.role,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        metrics: r.metrics,
      }));
    } else if (sec.key === 'experience' || sec.key === 'experiences') {
      let rows = await db
        .select()
        .from(experiences)
        .where(and(eq(experiences.status, 'published'), isNull(experiences.deletedAt)))
        .orderBy(asc(experiences.sortOrder));

      if (cutoffDateStr) {
        rows = rows.filter((r) => !r.startDate || r.startDate >= cutoffDateStr);
      }
      sectionData.experiences = rows.slice(0, limit).map((r) => ({
        id: r.id,
        company: r.company,
        role: pickLocale(r, 'role', loc),
        location: r.location,
        startDate: r.startDate,
        endDate: r.endDate,
        description: pickLocale(r, 'description', loc),
        achievements: r.achievements,
      }));
    } else if (sec.key === 'education') {
      const rows = await db
        .select()
        .from(education)
        .where(and(eq(education.status, 'published'), isNull(education.deletedAt)))
        .orderBy(asc(education.sortOrder));
      sectionData.education = rows.slice(0, limit).map((r) => ({
        id: r.id,
        institution: r.institution,
        degree: r.degree,
        field: pickLocale(r, 'field', loc),
        startDate: r.startDate,
        endDate: r.endDate,
        gpa: r.gpa,
      }));
    } else if (sec.key === 'skills' || sec.key === 'technologies') {
      let rows = await db
        .select()
        .from(technologies)
        .where(and(eq(technologies.status, 'published'), isNull(technologies.deletedAt)))
        .orderBy(asc(technologies.sortOrder));
      if (filter.technologyIds && filter.technologyIds.length > 0) {
        const allowSet = new Set(filter.technologyIds);
        rows = rows.filter((r) => allowSet.has(r.id));
      }
      sectionData.skills = rows.slice(0, limit);
    } else if (sec.key === 'certifications') {
      const rows = await db
        .select()
        .from(certifications)
        .where(and(eq(certifications.status, 'published'), isNull(certifications.deletedAt)))
        .orderBy(asc(certifications.sortOrder));
      sectionData.certifications = rows.slice(0, limit);
    } else if (sec.key === 'activities') {
      const rows = await db
        .select()
        .from(activities)
        .where(and(eq(activities.status, 'published'), isNull(activities.deletedAt)))
        .orderBy(asc(activities.sortOrder));
      sectionData.activities = rows.slice(0, limit);
    } else if (sec.key === 'achievements') {
      const rows = await db
        .select()
        .from(achievements)
        .where(and(eq(achievements.status, 'published'), isNull(achievements.deletedAt)))
        .orderBy(asc(achievements.sortOrder));
      sectionData.achievements = rows.slice(0, limit);
    } else if (sec.key === 'publications') {
      const rows = await db
        .select()
        .from(publications)
        .where(and(eq(publications.status, 'published'), isNull(publications.deletedAt)))
        .orderBy(asc(publications.sortOrder));
      sectionData.publications = rows.slice(0, limit);
    }
  }

  return {
    preset: {
      slug: preset.slug,
      name: preset.name,
      template: preset.template,
      locale: loc,
    },
    profile: profRow
      ? {
          name: profRow.name,
          headline: pickLocale(profRow, 'headline', loc),
          bio: pickLocale(profRow, 'bio', loc),
          email: profRow.email,
          location: profRow.location,
          socials: profRow.socials,
        }
      : null,
    sections: sectionData,
  };
}

export async function buildJsonResume(db: Database, locale: 'en' | 'id' = 'en') {
  const [profRow] = await db.select().from(profile).where(eq(profile.id, 1)).limit(1);
  const expRows = await db
    .select()
    .from(experiences)
    .where(and(eq(experiences.status, 'published'), isNull(experiences.deletedAt)))
    .orderBy(asc(experiences.sortOrder));
  const eduRows = await db
    .select()
    .from(education)
    .where(and(eq(education.status, 'published'), isNull(education.deletedAt)))
    .orderBy(asc(education.sortOrder));
  const projRows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.status, 'published'), isNull(projects.deletedAt)))
    .orderBy(asc(projects.sortOrder));
  const techRows = await db
    .select()
    .from(technologies)
    .where(and(eq(technologies.status, 'published'), isNull(technologies.deletedAt)))
    .orderBy(asc(technologies.sortOrder));
  const certRows = await db
    .select()
    .from(certifications)
    .where(and(eq(certifications.status, 'published'), isNull(certifications.deletedAt)))
    .orderBy(asc(certifications.sortOrder));

  const socialsObj = (profRow?.socials ?? {}) as Record<string, string>;

  return {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name: profRow?.name ?? '',
      label: profRow ? pickLocale(profRow, 'headline', locale) : '',
      email: profRow?.email ?? '',
      summary: profRow ? pickLocale(profRow, 'bio', locale) : '',
      location: {
        city: profRow?.location ?? '',
      },
      profiles: Object.entries(socialsObj).map(([network, url]) => ({
        network,
        url,
      })),
    },
    work: expRows.map((w) => ({
      name: w.company,
      position: pickLocale(w, 'role', locale),
      url: w.companyUrl ?? undefined,
      startDate: w.startDate,
      endDate: w.endDate ?? undefined,
      summary: pickLocale(w, 'description', locale) ?? undefined,
      highlights: (w.achievements ?? []).map((a) =>
        locale === 'id' ? (a.text_id ?? a.text_en) : a.text_en
      ),
    })),
    education: eduRows.map((e) => ({
      institution: e.institution,
      area: pickLocale(e, 'field', locale) ?? undefined,
      studyType: e.degree ?? undefined,
      startDate: e.startDate ?? undefined,
      endDate: e.endDate ?? undefined,
      score: e.gpa ? String(e.gpa) : undefined,
    })),
    certificates: certRows.map((c) => ({
      name: c.name,
      date: c.issueDate ?? undefined,
      issuer: c.issuer,
      url: c.credentialUrl ?? undefined,
    })),
    skills: techRows.map((t) => ({
      name: t.name,
      keywords: [t.category],
    })),
    projects: projRows.map((p) => ({
      name: pickLocale(p, 'title', locale),
      description: pickLocale(p, 'summary', locale),
      startDate: p.periodStart ?? undefined,
      endDate: p.periodEnd ?? undefined,
    })),
  };
}

