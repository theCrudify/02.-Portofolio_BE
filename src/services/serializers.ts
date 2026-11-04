import type { SupportedLocale } from '@/lib/locale';
import { pickLocale } from '@/lib/locale';
import type * as schema from '@/db/schema';

export type MediaRow = typeof schema.media.$inferSelect;
export type ProjectRow = typeof schema.projects.$inferSelect;
export type TechnologyRow = typeof schema.technologies.$inferSelect;
export type ProjectLinkRow = typeof schema.projectLinks.$inferSelect;
export type ProjectMediaRow = typeof schema.projectMedia.$inferSelect;
export type ExperienceRow = typeof schema.experiences.$inferSelect;
export type EducationRow = typeof schema.education.$inferSelect;
export type CertificationRow = typeof schema.certifications.$inferSelect;
export type ActivityRow = typeof schema.activities.$inferSelect;
export type AchievementRow = typeof schema.achievements.$inferSelect;
export type PublicationRow = typeof schema.publications.$inferSelect;
export type TestimonialRow = typeof schema.testimonials.$inferSelect;
export type ProfileRow = typeof schema.profile.$inferSelect;
export type SiteSettingsRow = typeof schema.siteSettings.$inferSelect;

export interface PublicMedia {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
  provider: 'cloudinary' | 'youtube' | 'vimeo' | 'loom';
  kind: 'image' | 'pdf' | 'video';
  embedId: string | null;
  thumbnailUrl: string | null;
  title: string | null;
  captionsUrl: string | null;
  sources?: { mp4: string; webm: string };
}

export function optimizeCloudinaryUrl(url: string, kind: 'image' | 'pdf' | 'video'): string {
  if (!url.includes('res.cloudinary.com') || url.includes('/f_auto,q_auto/')) {
    return url;
  }
  if (kind === 'image') {
    return url.replace('/upload/', '/upload/f_auto,q_auto/');
  }
  return url;
}

export function toMedia(
  row: MediaRow | null | undefined,
  locale: SupportedLocale,
): PublicMedia | null {
  if (!row || row.deletedAt) {
    return null;
  }
  const alt = pickLocale(row, 'alt', locale) ?? pickLocale(row, 'title', locale) ?? '';
  const title = pickLocale(row, 'title', locale);
  const url =
    row.provider === 'cloudinary' ? optimizeCloudinaryUrl(row.url, row.kind) : row.url;

  const result: PublicMedia = {
    id: row.id,
    url,
    width: row.width ?? null,
    height: row.height ?? null,
    alt,
    provider: row.provider,
    kind: row.kind,
    embedId: row.embedId ?? null,
    thumbnailUrl: row.thumbnailUrl ?? null,
    title,
    captionsUrl: row.captionsUrl ?? null,
  };

  if (row.provider === 'cloudinary' && row.kind === 'video') {
    const baseWithoutExt = row.url.replace(/\.[a-zA-Z0-9]+$/, '');
    result.sources = {
      mp4: `${baseWithoutExt}.mp4`,
      webm: `${baseWithoutExt}.webm`,
    };
  }

  return result;
}

export function toBullets(
  items: { text_en: string; text_id?: string }[] | null | undefined,
  locale: SupportedLocale,
): string[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => {
    if (locale === 'id' && item.text_id && item.text_id.trim().length > 0) {
      return item.text_id;
    }
    return item.text_en;
  });
}

export function toMetrics(
  items: { label_en: string; label_id?: string; value: string }[] | null | undefined,
  locale: SupportedLocale,
): { label: string; value: string }[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => ({
    label:
      locale === 'id' && item.label_id && item.label_id.trim().length > 0
        ? item.label_id
        : item.label_en,
    value: item.value,
  }));
}

export interface PublicTechChip {
  name: string;
  slug: string;
  icon: string | null;
}

export function toTechChip(row: TechnologyRow): PublicTechChip {
  return {
    name: row.name,
    slug: row.slug,
    icon: row.icon ?? null,
  };
}

export interface PublicProjectLink {
  type: ProjectLinkRow['type'];
  label: string;
  url: string | null;
  isPrivate: boolean;
}

export function toProjectLink(row: ProjectLinkRow): PublicProjectLink {
  return {
    type: row.type,
    label: row.label,
    url: row.isPrivate ? null : (row.url ?? null),
    isPrivate: row.isPrivate,
  };
}

export interface PublicProjectCard {
  slug: string;
  title: string;
  summary: string;
  type: ProjectRow['type'];
  projectState: ProjectRow['projectState'];
  featured: boolean;
  cover: { url: string; width: number | null; height: number | null; alt: string } | null;
  clip: PublicMedia | null;
  technologies: PublicTechChip[];
  primaryLink: PublicProjectLink | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export function toProjectCard(
  row: ProjectRow,
  coverMedia: MediaRow | null | undefined,
  technologies: TechnologyRow[],
  links: ProjectLinkRow[],
  clipMedia: MediaRow | null | undefined,
  locale: SupportedLocale,
): PublicProjectCard {
  const coverObj = toMedia(coverMedia, locale);
  const clipObj = toMedia(clipMedia, locale);
  const sortedLinks = [...links].sort((a, b) => a.sortOrder - b.sortOrder);
  const primaryLinkRow = sortedLinks.find((l) => !l.isPrivate && l.url) ?? sortedLinks[0] ?? null;

  return {
    slug: row.slug,
    title: pickLocale(row, 'title', locale) ?? row.titleEn,
    summary: pickLocale(row, 'summary', locale) ?? row.summaryEn,
    type: row.type,
    projectState: row.projectState,
    featured: row.featured,
    cover: coverObj
      ? {
          url: coverObj.url,
          width: coverObj.width,
          height: coverObj.height,
          alt: coverObj.alt,
        }
      : null,
    clip: clipObj,
    technologies: technologies.slice(0, 4).map(toTechChip),
    primaryLink: primaryLinkRow ? toProjectLink(primaryLinkRow) : null,
    periodStart: row.periodStart ?? null,
    periodEnd: row.periodEnd ?? null,
  };
}

export interface GroupedTechnologies {
  frontend: PublicTechChip[];
  backend: PublicTechChip[];
  database: PublicTechChip[];
  devops: PublicTechChip[];
  other: PublicTechChip[];
}

export interface PublicProjectMediaItem {
  id: string;
  role: ProjectMediaRow['role'];
  provider: MediaRow['provider'];
  kind: MediaRow['kind'];
  url: string;
  embedId: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  alt: string;
  title: string | null;
  caption: string | null;
  sources?: { mp4: string; webm: string };
}

export function toProjectDetail(
  row: ProjectRow,
  options: {
    coverMedia?: MediaRow | null;
    architectureMedia?: MediaRow | null;
    techWithGroup: { tech: TechnologyRow; group: keyof GroupedTechnologies; sortOrder: number }[];
    links: ProjectLinkRow[];
    mediaItems: { relation: ProjectMediaRow; media: MediaRow }[];
    prev: { slug: string; title: string } | null;
    next: { slug: string; title: string } | null;
    locale: SupportedLocale;
  },
) {
  const { locale } = options;
  const title = pickLocale(row, 'title', locale) ?? row.titleEn;
  const summary = pickLocale(row, 'summary', locale) ?? row.summaryEn;
  const coverObj = toMedia(options.coverMedia, locale);
  const archObj = toMedia(options.architectureMedia, locale);

  const grouped: GroupedTechnologies = {
    frontend: [],
    backend: [],
    database: [],
    devops: [],
    other: [],
  };

  const sortedTech = [...options.techWithGroup].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const item of sortedTech) {
    const groupKey = item.group in grouped ? item.group : 'other';
    grouped[groupKey].push(toTechChip(item.tech));
  }

  const sortedLinks = [...options.links]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toProjectLink);

  const sortedMedia: PublicProjectMediaItem[] = [...options.mediaItems]
    .filter((m) => !m.media.deletedAt)
    .sort((a, b) => a.relation.sortOrder - b.relation.sortOrder)
    .map(({ relation, media }) => {
      const m = toMedia(media, locale)!;
      return {
        id: m.id,
        role: relation.role,
        provider: m.provider,
        kind: m.kind,
        url: m.url,
        embedId: m.embedId,
        thumbnailUrl: m.thumbnailUrl,
        width: m.width,
        height: m.height,
        alt: m.alt,
        title: m.title,
        caption: pickLocale(relation, 'caption', locale),
        ...(m.sources ? { sources: m.sources } : {}),
      };
    });

  return {
    slug: row.slug,
    title,
    summary,
    type: row.type,
    projectState: row.projectState,
    role: row.role ?? null,
    teamSize: row.teamSize ?? null,
    client: row.client ?? null,
    periodStart: row.periodStart ?? null,
    periodEnd: row.periodEnd ?? null,
    problem: pickLocale(row, 'problem', locale),
    solution: pickLocale(row, 'solution', locale),
    result: pickLocale(row, 'result', locale),
    challenges: pickLocale(row, 'challenges', locale),
    metrics: toMetrics(row.metrics, locale),
    highlights: toBullets(row.highlights, locale),
    technologies: grouped,
    links: sortedLinks,
    cover: coverObj
      ? {
          url: coverObj.url,
          width: coverObj.width,
          height: coverObj.height,
          alt: coverObj.alt,
        }
      : null,
    architecture: archObj
      ? {
          url: archObj.url,
          width: archObj.width,
          height: archObj.height,
          alt: archObj.alt,
        }
      : null,
    media: sortedMedia,
    seo: {
      title: pickLocale(row, 'metaTitle', locale) ?? title,
      description: pickLocale(row, 'metaDescription', locale) ?? summary,
    },
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    prev: options.prev,
    next: options.next,
  };
}

export function toExperience(
  row: ExperienceRow,
  technologies: TechnologyRow[],
  companyLogo: MediaRow | null | undefined,
  locale: SupportedLocale,
) {
  const logo = toMedia(companyLogo, locale);
  return {
    id: row.id,
    company: row.company,
    companyLogo: logo ? { url: logo.url, alt: logo.alt || row.company } : null,
    companyUrl: row.companyUrl ?? null,
    role: pickLocale(row, 'role', locale) ?? row.roleEn,
    employmentType: row.employmentType,
    location: row.location ?? null,
    workMode: row.workMode ?? null,
    startDate: row.startDate,
    endDate: row.endDate ?? null,
    description: pickLocale(row, 'description', locale),
    achievements: toBullets(row.achievements, locale),
    technologies: technologies.map(toTechChip),
  };
}

export function toEducation(
  row: EducationRow,
  logoMedia: MediaRow | null | undefined,
  locale: SupportedLocale,
) {
  const logo = toMedia(logoMedia, locale);
  return {
    id: row.id,
    institution: row.institution,
    logo: logo ? { url: logo.url, alt: logo.alt || row.institution } : null,
    degree: row.degree ?? null,
    field: pickLocale(row, 'field', locale),
    startDate: row.startDate ?? null,
    endDate: row.endDate ?? null,
    gpa: row.gpa ?? null,
    gpaScale: row.gpaScale ?? null,
    description: pickLocale(row, 'description', locale),
    activities: toBullets(row.activities, locale),
  };
}

export function toCertification(
  row: CertificationRow,
  issuerMedia: MediaRow | null | undefined,
  imageMedia: MediaRow | null | undefined,
  locale: SupportedLocale,
  nowDate: Date = new Date(),
) {
  const issuerLogo = toMedia(issuerMedia, locale);
  const image = toMedia(imageMedia, locale);
  const todayIso = nowDate.toISOString().slice(0, 10);
  const isExpired = Boolean(row.expiryDate && row.expiryDate < todayIso);

  return {
    id: row.id,
    type: row.type,
    name: row.name,
    issuer: row.issuer,
    issuerLogo: issuerLogo ? { url: issuerLogo.url, alt: issuerLogo.alt || row.issuer } : null,
    issueDate: row.issueDate ?? null,
    expiryDate: row.expiryDate ?? null,
    isExpired,
    credentialId: row.credentialId ?? null,
    credentialUrl: row.credentialUrl ?? null,
    image: image
      ? { url: image.url, width: image.width, height: image.height, alt: image.alt || row.name }
      : null,
    featured: row.featured,
  };
}

export function toActivity(
  row: ActivityRow,
  mediaItem: MediaRow | null | undefined,
  locale: SupportedLocale,
) {
  const mediaObj = toMedia(mediaItem, locale);
  return {
    id: row.id,
    type: row.type,
    organization: row.organization,
    eventName: row.eventName ?? null,
    role: pickLocale(row, 'role', locale) ?? row.roleEn,
    startDate: row.startDate ?? null,
    endDate: row.endDate ?? null,
    description: pickLocale(row, 'description', locale),
    achievements: toBullets(row.achievements, locale),
    media: mediaObj
      ? { url: mediaObj.url, width: mediaObj.width, height: mediaObj.height, alt: mediaObj.alt }
      : null,
    linkUrl: row.linkUrl ?? null,
  };
}

export function toAchievement(
  row: AchievementRow,
  certMedia: MediaRow | null | undefined,
  locale: SupportedLocale,
) {
  const certObj = toMedia(certMedia, locale);
  return {
    id: row.id,
    title: pickLocale(row, 'title', locale) ?? row.titleEn,
    issuer: row.issuer ?? null,
    eventName: row.eventName ?? null,
    rank: row.rank ?? null,
    date: row.date ?? null,
    description: pickLocale(row, 'description', locale),
    certificate: certObj
      ? { url: certObj.url, width: certObj.width, height: certObj.height, alt: certObj.alt }
      : null,
    linkUrl: row.linkUrl ?? null,
  };
}

export function toPublication(
  row: PublicationRow,
  videoMedia: MediaRow | null | undefined,
  locale: SupportedLocale,
) {
  const videoObj = toMedia(videoMedia, locale);
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    venue: row.venue ?? null,
    date: row.date ?? null,
    summary: pickLocale(row, 'summary', locale),
    url: row.url ?? null,
    video: videoObj,
  };
}

export function toTestimonial(
  row: TestimonialRow,
  avatarMedia: MediaRow | null | undefined,
  locale: SupportedLocale,
) {
  const avatarObj = toMedia(avatarMedia, locale);
  return {
    id: row.id,
    name: row.name,
    position: row.position ?? null,
    company: row.company ?? null,
    avatar: avatarObj ? { url: avatarObj.url, alt: avatarObj.alt || row.name } : null,
    relationship: row.relationship ?? null,
    quote: pickLocale(row, 'quote', locale) ?? row.quoteEn,
    linkedinUrl: row.linkedinUrl ?? null,
  };
}

export function toPublicProfile(
  row: ProfileRow | null | undefined,
  avatarMedia: MediaRow | null | undefined,
  locale: SupportedLocale,
) {
  if (!row) {
    return null;
  }
  const avatarObj = toMedia(avatarMedia, locale);
  const interests = Array.isArray(row.interests)
    ? row.interests.map((item) => ({
        label:
          locale === 'id' && item.label_id && item.label_id.trim().length > 0
            ? item.label_id
            : item.label_en,
        icon: item.icon ?? null,
      }))
    : [];

  return {
    name: row.name,
    headline: pickLocale(row, 'headline', locale) ?? row.headlineEn,
    bio: pickLocale(row, 'bio', locale) ?? row.bioEn,
    avatar: avatarObj
      ? {
          url: avatarObj.url,
          width: avatarObj.width,
          height: avatarObj.height,
          alt: avatarObj.alt || row.name,
        }
      : null,
    location: row.location ?? null,
    timezone: row.timezone,
    email: row.email ?? null,
    socials: row.socials ?? {},
    availability: row.availability,
    workPreference: row.workPreference,
    languages: row.languages ?? [],
    interests,
    referencesNote: pickLocale(row, 'referencesNote', locale),
    careerStartDate: row.careerStartDate ?? null,
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export function toPublicSettings(
  row: SiteSettingsRow | null | undefined,
  ogMedia: MediaRow | null | undefined,
  locale: SupportedLocale,
) {
  const ogObj = toMedia(ogMedia, locale);
  return {
    themePreset: row?.themePreset ?? 'slate',
    colorMode: row?.colorMode ?? 'system',
    fontPair: row?.fontPair ?? 'geist',
    sectionOrder: row?.sectionOrder ?? [
      'hero',
      'about',
      'projects',
      'skills',
      'experience',
      'education',
      'certifications',
      'activities',
      'achievements',
      'publications',
      'testimonials',
      'github',
      'contact',
    ],
    hiddenSections: row?.hiddenSections ?? [],
    heroCvButtons: row?.heroCvButtons ?? 'both',
    seo: {
      title: row ? pickLocale(row, 'seoTitle', locale) : null,
      description: row ? pickLocale(row, 'seoDescription', locale) : null,
      ogImage: ogObj
        ? { url: ogObj.url, width: ogObj.width, height: ogObj.height, alt: ogObj.alt }
        : null,
    },
  };
}
