import type { DbClient } from '@/db/client';
import { defaultCacheService } from '@/core/cache/memory-cache.service';
import type { ICacheService } from '@/core/cache/cache.interface';
import type { SupportedLocale } from '@/lib/locale';
import {
  DrizzleSiteRepository,
  type ISiteRepository,
  type RawSiteData,
} from '@/repositories/site.repository';
import type { LookupGroupCode } from '@/db/queries/lookups';
import { pickLocale } from '@/lib/locale';
import { toContext } from '@/repositories/context.repository';
import {
  groupTechnologies,
  toAchievement,
  toActivity,
  toCertification,
  toEducation,
  toExperience,
  toProjectCard,
  toPublication,
  toPublicProfile,
  toPublicSettings,
  toTestimonial,
  lookupOf,
  toBullets,
  toMetrics,
  type SerializeContext,
  type TechnologyRow,
} from '@/services/serializers';

export function calculateYearsExperience(
  careerStartDate?: string | null,
  now = new Date(),
): number {
  if (!careerStartDate) {
    return 0;
  }
  const start = new Date(careerStartDate);
  if (Number.isNaN(start.getTime())) {
    return 0;
  }
  const diffMs = now.getTime() - start.getTime();
  if (diffMs <= 0) {
    return 0;
  }
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(years);
}

/**
 * SiteService: Clean OOP application service managing homepage & layout site aggregation
 * with SOLID principles and high-efficiency multi-tier caching.
 */
export class SiteService {
  constructor(
    private readonly siteRepo: ISiteRepository,
    private readonly cache: ICacheService = defaultCacheService,
  ) {}

  /**
   * Retrieve aggregated site data with caching (tag: 'site', TTL: 300s).
   */
  async getSite(locale: SupportedLocale) {
    const cacheKey = `site:v2:${locale}`;
    return this.cache.remember(
      cacheKey,
      300,
      async () => {
        const raw = await this.siteRepo.fetchSiteAggregate();
        return this.serializeSiteData(raw, locale);
      },
      ['site'],
    );
  }

  /**
   * Invalidate all site cache entries.
   */
  async invalidateCache(): Promise<void> {
    await this.cache.invalidateTag('site');
  }

  private serializeSiteData(raw: RawSiteData, locale: SupportedLocale) {
    const ctx = toContext(raw.context, locale);
    const c = serializeCollections(raw, ctx);
    const profileRow = raw.profileRows[0] ?? null;

    return {
      profile: toPublicProfile(profileRow, ctx, {
        socials: raw.socialRows,
        languages: raw.languageRows,
        interests: raw.interestRows,
      }),
      settings: toPublicSettings(raw.settingsRows[0] ?? null, ctx, raw.sectionRows),
      stats: {
        yearsExperience: calculateYearsExperience(profileRow?.careerStartDate),
        projectCount: raw.projectRows.length,
        certificationCount: raw.certRows.length,
      },
      technologies: c.technologies,
      experiences: c.experiences,
      education: c.education,
      certifications: c.certifications.filter((cert) => cert.featured),
      activities: c.activities,
      achievements: c.achievements,
      publications: c.publications,
      testimonials: c.testimonials,
      github: raw.githubRows[0]?.data ?? null,
      featuredProjects: c.projects.filter((p) => p.featured).slice(0, 6),
      // Public CV export presets (downloadable PDFs), chosen per locale by the frontend.
      exportPresets: raw.presetRows.map((p) => ({
        slug: p.slug,
        name: p.name,
        template: ctx.lookups.code(p.templateId) ?? 'full',
        locale: ctx.lookups.code(p.localeId) ?? 'en',
      })),
      // Filter options for public listings come from master data, not the frontend.
      filters: {
        projectTypes: lookupOptions(ctx, 'project_type'),
        certificationTypes: lookupOptions(ctx, 'cert_type'),
        activityTypes: lookupOptions(ctx, 'activity_type'),
      },
    };
  }
}

function lookupOptions(ctx: SerializeContext, group: LookupGroupCode) {
  return ctx.lookups.group(group).flatMap((row) => lookupOf(ctx, row.id) ?? []);
}

/** Every published collection, fully linked; shared by the site payload and the CV export. */
export function serializeCollections(raw: RawSiteData, ctx: SerializeContext) {
  const { locale } = ctx;
  const techMap = new Map<string, TechnologyRow>(raw.techRows.map((t) => [t.id, t]));
  const projectMap = new Map(raw.projectRows.map((p) => [p.id, p]));
  const byParent = <T, K extends keyof T>(rows: T[], key: K, id: string) =>
    rows.filter((r) => r[key] === id);

  const projects = raw.projectRows.map((p) => {
    const techs = byParent(raw.projTechRows, 'projectId', p.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .flatMap((pt) => techMap.get(pt.technologyId) ?? []);
    const clip = byParent(raw.projClipRows, 'projectId', p.id).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    )[0];
    return {
      ...toProjectCard(p, ctx, techs, byParent(raw.projLinkRows, 'projectId', p.id), clip?.mediaId ?? null),
      role: pickLocale(p, 'role', locale),
      responsibilities: toBullets(byParent(raw.projResponsibilityRows, 'projectId', p.id), locale),
      metrics: toMetrics(byParent(raw.projMetricRows, 'projectId', p.id), locale),
    };
  });

  return {
    projects,
    // Skill categories are lookups: grouped and ordered by the tech_category group.
    technologies: groupTechnologies(
      ctx,
      raw.techRows
        .filter((t) => t.showOnSkills)
        .map((t) => ({ tech: t, groupId: t.categoryId, sortOrder: t.sortOrder })),
    ),
    experiences: raw.experienceRows.map((exp) =>
      toExperience(exp, ctx, {
        technologies: byParent(raw.expTechRows, 'experienceId', exp.id).flatMap(
          (et) => techMap.get(et.technologyId) ?? [],
        ),
        responsibilities: byParent(raw.expResponsibilityRows, 'experienceId', exp.id),
        achievements: byParent(raw.expAchievementRows, 'experienceId', exp.id),
        // Only published projects are linked publicly.
        projects: byParent(raw.expProjectRows, 'experienceId', exp.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .flatMap((ep) => {
            const p = projectMap.get(ep.projectId);
            return p ? [{ slug: p.slug, title: pickLocale(p, 'title', locale) ?? p.titleEn }] : [];
          }),
      }),
    ),
    education: raw.educationRows.map((edu) =>
      toEducation(edu, ctx, byParent(raw.eduActivityRows, 'educationId', edu.id)),
    ),
    certifications: raw.certRows.map((cert) => toCertification(cert, ctx)),
    activities: raw.activityRows.map((act) =>
      toActivity(act, ctx, byParent(raw.activityAchievementRows, 'activityId', act.id)),
    ),
    achievements: raw.achievementRows.map((a) => toAchievement(a, ctx)),
    publications: raw.publicationRows.map((p) => toPublication(p, ctx)),
    testimonials: raw.testimonialRows.map((t) => toTestimonial(t, ctx)),
  };
}

/**
 * Functional adapter preserving backward compatibility with existing tests and router bindings.
 */
export async function getSite(
  db: DbClient,
  locale: SupportedLocale,
  cache: ICacheService = defaultCacheService,
) {
  const repo = new DrizzleSiteRepository(db);
  const service = new SiteService(repo, cache);
  return service.getSite(locale);
}
