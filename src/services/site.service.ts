import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { publishedOnly } from '@/db/queries/common';
import * as schema from '@/db/schema';
import type { SupportedLocale } from '@/lib/locale';
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

export function calculateYearsExperience(careerStartDate?: string | null, now = new Date()): number {
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

export async function getSite(db: DbClient, locale: SupportedLocale) {
  const [
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
  ] = await Promise.all([
    db.select().from(schema.profile).where(eq(schema.profile.id, 1)),
    db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)),
    db
      .select()
      .from(schema.technologies)
      .where(publishedOnly(schema.technologies))
      .orderBy(asc(schema.technologies.sortOrder)),
    db
      .select()
      .from(schema.projects)
      .where(publishedOnly(schema.projects))
      .orderBy(asc(schema.projects.sortOrder)),
    db
      .select()
      .from(schema.experiences)
      .where(publishedOnly(schema.experiences))
      .orderBy(asc(schema.experiences.sortOrder)),
    db
      .select()
      .from(schema.education)
      .where(publishedOnly(schema.education))
      .orderBy(asc(schema.education.sortOrder)),
    db
      .select()
      .from(schema.certifications)
      .where(publishedOnly(schema.certifications))
      .orderBy(asc(schema.certifications.sortOrder)),
    db
      .select()
      .from(schema.activities)
      .where(publishedOnly(schema.activities))
      .orderBy(asc(schema.activities.sortOrder)),
    db
      .select()
      .from(schema.achievements)
      .where(publishedOnly(schema.achievements))
      .orderBy(asc(schema.achievements.sortOrder)),
    db
      .select()
      .from(schema.publications)
      .where(publishedOnly(schema.publications))
      .orderBy(asc(schema.publications.sortOrder)),
    db
      .select()
      .from(schema.testimonials)
      .where(publishedOnly(schema.testimonials))
      .orderBy(asc(schema.testimonials.sortOrder)),
    db.select().from(schema.githubCache).where(eq(schema.githubCache.key, 'stats')),
  ]);

  const featuredProjectRows = projectRows.filter((p) => p.featured).slice(0, 6);
  const featuredCertRows = certRows.filter((c) => c.featured);

  const featuredProjectIds = featuredProjectRows.map((p) => p.id);
  const experienceIds = experienceRows.map((e) => e.id);

  const [projTechRows, projLinkRows, projMediaRows, expTechRows, allMediaRows] = await Promise.all([
    featuredProjectIds.length > 0
      ? db
          .select()
          .from(schema.projectTechnologies)
          .where(inArray(schema.projectTechnologies.projectId, featuredProjectIds))
      : Promise.resolve([]),
    featuredProjectIds.length > 0
      ? db
          .select()
          .from(schema.projectLinks)
          .where(inArray(schema.projectLinks.projectId, featuredProjectIds))
      : Promise.resolve([]),
    featuredProjectIds.length > 0
      ? db
          .select()
          .from(schema.projectMedia)
          .where(
            and(
              inArray(schema.projectMedia.projectId, featuredProjectIds),
              eq(schema.projectMedia.role, 'clip'),
            ),
          )
      : Promise.resolve([]),
    experienceIds.length > 0
      ? db
          .select()
          .from(schema.experienceTechnologies)
          .where(inArray(schema.experienceTechnologies.experienceId, experienceIds))
      : Promise.resolve([]),
    db.select().from(schema.media).where(isNull(schema.media.deletedAt)),
  ]);

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

  const avatarMedia = profileRow?.avatarMediaId ? mediaMap.get(profileRow.avatarMediaId) : null;
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
