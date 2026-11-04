import type { Database } from '../db/client';
import type { SupportedLocale } from '../lib/locale';
import { toContext } from '../repositories/context.repository';
import { DrizzleSiteRepository } from '../repositories/site.repository';
import { toPublicProfile } from './serializers';
import { serializeCollections } from './site.service';

/** An export preset with its child rows resolved to codes (see document.service). */
export interface ExportPresetRow {
  id: string;
  slug: string;
  name: string;
  template: string; // export_template code
  locale: string; // locale code
  featuredOnly: boolean;
  sinceYears: number | null;
  isPublic: boolean;
  sections: { key: string; limit: number | null }[]; // key = site_section code
  technologyIds: string[];
}

const toLocale = (code: string | null | undefined): SupportedLocale => (code === 'id' ? 'id' : 'en');

async function loadEverything(db: Database, locale: SupportedLocale) {
  const raw = await new DrizzleSiteRepository(db).fetchSiteAggregate();
  const ctx = toContext(raw.context, locale);
  const profile = toPublicProfile(raw.profileRows[0] ?? null, ctx, {
    socials: raw.socialRows,
    languages: raw.languageRows,
    interests: raw.interestRows,
  });
  return { raw, collections: serializeCollections(raw, ctx), profile };
}

export async function buildExport(db: Database, preset: ExportPresetRow, localeOverride?: SupportedLocale) {
  const loc = localeOverride ?? toLocale(preset.locale);
  const cutoff = preset.sinceYears
    ? new Date(Date.now() - preset.sinceYears * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : null;
  const { raw, collections: c, profile } = await loadEverything(db, loc);
  const allowedTech = new Set(preset.technologyIds);
  const allowedSlugs = new Set(raw.techRows.filter((t) => allowedTech.has(t.id)).map((t) => t.slug));

  const pick: Record<string, () => unknown[]> = {
    projects: () =>
      c.projects
        .filter((p) => !preset.featuredOnly || p.featured)
        .filter((p) => !cutoff || !p.periodStart || p.periodStart >= cutoff),
    experience: () => c.experiences.filter((e) => !cutoff || e.startDate >= cutoff),
    education: () => c.education,
    skills: () =>
      allowedTech.size === 0
        ? c.technologies
        : c.technologies
            .map((g) => ({ ...g, items: g.items.filter((t) => allowedSlugs.has(t.slug)) }))
            .filter((g) => g.items.length > 0),
    certifications: () => c.certifications.filter((cert) => !preset.featuredOnly || cert.featured),
    activities: () => c.activities,
    achievements: () => c.achievements,
    publications: () => c.publications,
    testimonials: () => c.testimonials,
  };

  // Keyed by section code, in the preset's order (object keys keep insertion order).
  const sections: Record<string, unknown[]> = {};
  for (const sec of preset.sections) {
    const items = pick[sec.key]?.();
    if (items) sections[sec.key] = items.slice(0, sec.limit ?? 50);
  }

  return {
    preset: { slug: preset.slug, name: preset.name, template: preset.template, locale: loc },
    profile,
    sections,
  };
}

/** https://jsonresume.org/schema */
export async function buildJsonResume(db: Database, locale: SupportedLocale = 'en') {
  const { collections: c, profile } = await loadEverything(db, locale);

  return {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name: profile?.name ?? '',
      label: profile?.headline ?? '',
      email: profile?.email ?? '',
      summary: profile?.bio ?? '',
      location: { city: profile?.location ?? '' },
      profiles: (profile?.socials ?? []).map((s) => ({
        network: s.platform.label,
        username: s.handle ?? undefined,
        url: s.url,
      })),
    },
    work: c.experiences.map((w) => ({
      name: w.organization?.name ?? '',
      position: w.role,
      url: w.organization?.websiteUrl ?? undefined,
      startDate: w.startDate,
      endDate: w.endDate ?? undefined,
      summary: w.description ?? undefined,
      highlights: [...w.responsibilities, ...w.achievements],
    })),
    education: c.education.map((e) => ({
      institution: e.organization?.name ?? '',
      area: e.field ?? undefined,
      studyType: e.degree ?? undefined,
      startDate: e.startDate ?? undefined,
      endDate: e.endDate ?? undefined,
      score: e.gpa ? String(e.gpa) : undefined,
    })),
    certificates: c.certifications.map((cert) => ({
      name: cert.name,
      date: cert.issueDate ?? undefined,
      issuer: cert.issuer?.name ?? '',
      url: cert.credentialUrl ?? undefined,
    })),
    skills: c.technologies.map((g) => ({
      name: g.group.label,
      keywords: g.items.map((t) => t.name),
    })),
    projects: c.projects.map((p) => ({
      name: p.title,
      description: p.summary,
      highlights: p.responsibilities,
      startDate: p.periodStart ?? undefined,
      endDate: p.periodEnd ?? undefined,
    })),
  };
}
