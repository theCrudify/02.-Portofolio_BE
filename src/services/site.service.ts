import type { DbClient } from '@/db/client';
import { defaultCacheService } from '@/core/cache/memory-cache.service';
import type { ICacheService } from '@/core/cache/cache.interface';
import type { SupportedLocale } from '@/lib/locale';
import {
  DrizzleSiteRepository,
  type ISiteRepository,
  type RawSiteData,
} from '@/repositories/site.repository';
import {
  toAchievement,
  toActivity,
  toCertification,
  toEducation,
  toExperience,
  toProjectCard,
  toPublication,
  toPublicProfile,
  toPublicSettings,
  toTechChip,
  toTestimonial,
  type MediaRow,
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
    const cacheKey = `site:v1:${locale}`;
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
    const {
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
    } = raw;

    const featuredProjectRows = projectRows.filter((p) => p.featured).slice(0, 6);
    const featuredCertRows = certRows.filter((c) => c.featured);

    const mediaMap = new Map<string, MediaRow>();
    for (const m of allMediaRows) {
      mediaMap.set(m.id, m);
    }

    const techMap = new Map<string, TechnologyRow>();
    for (const t of techRows) {
      techMap.set(t.id, t);
    }

    const groupedTechnologies: Record<
      'frontend' | 'backend' | 'database' | 'devops' | 'tools' | 'soft_skill',
      ReturnType<typeof toTechChip>[]
    > = {
      frontend: [],
      backend: [],
      database: [],
      devops: [],
      tools: [],
      soft_skill: [],
    };

    for (const t of techRows) {
      if (t.showOnSkills) {
        groupedTechnologies[t.category].push(toTechChip(t));
      }
    }

    const featuredProjects = featuredProjectRows.map((p) => {
      const pTechs = projTechRows
        .filter((pt) => pt.projectId === p.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((pt) => techMap.get(pt.technologyId))
        .filter((t): t is TechnologyRow => Boolean(t));

      const pLinks = projLinkRows.filter((pl) => pl.projectId === p.id);
      const clipRelation = projMediaRows
        .filter((pm) => pm.projectId === p.id && pm.role === 'clip')
        .sort((a, b) => a.sortOrder - b.sortOrder)[0];
      const clipMedia = clipRelation ? mediaMap.get(clipRelation.mediaId) : null;
      const coverMedia = p.coverMediaId ? mediaMap.get(p.coverMediaId) : null;

      return toProjectCard(p, coverMedia, pTechs, pLinks, clipMedia, locale);
    });

    const experiences = experienceRows.map((exp) => {
      const eTechs = expTechRows
        .filter((et) => et.experienceId === exp.id)
        .map((et) => techMap.get(et.technologyId))
        .filter((t): t is TechnologyRow => Boolean(t));
      const logo = exp.companyMediaId ? mediaMap.get(exp.companyMediaId) : null;
      return toExperience(exp, eTechs, logo, locale);
    });

    const education = educationRows.map((edu) => {
      const logo = edu.logoMediaId ? mediaMap.get(edu.logoMediaId) : null;
      return toEducation(edu, logo, locale);
    });

    const certifications = featuredCertRows.map((cert) => {
      const issuerLogo = cert.issuerMediaId ? mediaMap.get(cert.issuerMediaId) : null;
      const image = cert.imageMediaId ? mediaMap.get(cert.imageMediaId) : null;
      return toCertification(cert, issuerLogo, image, locale);
    });

    const activities = activityRows.map((act) => {
      const mediaItem = act.mediaId ? mediaMap.get(act.mediaId) : null;
      return toActivity(act, mediaItem, locale);
    });

    const achievements = achievementRows.map((ach) => {
      const certMedia = ach.certificateMediaId ? mediaMap.get(ach.certificateMediaId) : null;
      return toAchievement(ach, certMedia, locale);
    });

    const publications = publicationRows.map((pub) => {
      const videoMedia = pub.videoMediaId ? mediaMap.get(pub.videoMediaId) : null;
      return toPublication(pub, videoMedia, locale);
    });

    const testimonials = testimonialRows.map((testi) => {
      const avatar = testi.avatarMediaId ? mediaMap.get(testi.avatarMediaId) : null;
      return toTestimonial(testi, avatar, locale);
    });

    const profileRow = profileRows[0] ?? null;
    const settingsRow = settingsRows[0] ?? null;

    const avatarMedia = profileRow?.avatarMediaId
      ? mediaMap.get(profileRow.avatarMediaId)
      : null;
    const ogMedia = settingsRow?.ogMediaId ? mediaMap.get(settingsRow.ogMediaId) : null;

    return {
      profile: toPublicProfile(profileRow, avatarMedia, locale),
      settings: toPublicSettings(settingsRow, ogMedia, locale),
      stats: {
        yearsExperience: calculateYearsExperience(profileRow?.careerStartDate),
        projectCount: projectRows.length,
        certificationCount: certRows.length,
      },
      technologies: groupedTechnologies,
      experiences,
      education,
      certifications,
      activities,
      achievements,
      publications,
      testimonials,
      github: githubRows[0]?.data ?? null,
      featuredProjects,
    };
  }
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
