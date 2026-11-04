import type { SupportedLocale } from '@/lib/locale';
import { pickLocale } from '@/lib/locale';
import type * as schema from '@/db/schema';
import type { LookupIndex, PublicLookup } from '@/db/queries/lookups';
import type { RawExtras } from '@/repositories/extras.repository';

export type MediaRow = typeof schema.media.$inferSelect;
export type OrganizationRow = typeof schema.organizations.$inferSelect;
export type ProjectRow = typeof schema.projects.$inferSelect;
export type TechnologyRow = typeof schema.technologies.$inferSelect;
export type ProjectLinkRow = typeof schema.projectLinks.$inferSelect;
export type ProjectMediaRow = typeof schema.projectMedia.$inferSelect;
export type ProjectMetricRow = typeof schema.projectMetrics.$inferSelect;
export type ExperienceRow = typeof schema.experiences.$inferSelect;
export type EducationRow = typeof schema.education.$inferSelect;
export type CertificationRow = typeof schema.certifications.$inferSelect;
export type ActivityRow = typeof schema.activities.$inferSelect;
export type AchievementRow = typeof schema.achievements.$inferSelect;
export type PublicationRow = typeof schema.publications.$inferSelect;
export type TestimonialRow = typeof schema.testimonials.$inferSelect;
export type ProfileRow = typeof schema.profile.$inferSelect;
export type ProfileSocialRow = typeof schema.profileSocials.$inferSelect;
export type ProfileLanguageRow = typeof schema.profileLanguages.$inferSelect;
export type ProfileInterestRow = typeof schema.profileInterests.$inferSelect;
export type SiteSettingsRow = typeof schema.siteSettings.$inferSelect;
export type SiteSectionRow = typeof schema.siteSections.$inferSelect;

/** Bilingual bullet row (responsibilities, highlights, achievements, activities). */
export interface BulletRow {
  textEn: string;
  textId: string | null;
  sortOrder: number;
}

/** Everything a serializer needs besides the row itself. */
export interface SerializeContext {
  locale: SupportedLocale;
  lookups: LookupIndex;
  media: Map<string, MediaRow>;
  organizations: Map<string, OrganizationRow>;
}

export function lookupOf(ctx: SerializeContext, id: string | null | undefined): PublicLookup | null {
  return ctx.lookups.toPublic(id, ctx.locale);
}

/** For NOT NULL lookup columns: an id that no longer resolves still yields a usable value. */
function requiredLookup(ctx: SerializeContext, id: string): PublicLookup {
  return lookupOf(ctx, id) ?? { code: 'unknown', label: '', icon: null, color: null };
}

export interface PublicMedia {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
  provider: string;
  kind: string;
  embedId: string | null;
  thumbnailUrl: string | null;
  title: string | null;
  captionsUrl: string | null;
  sources?: { mp4: string; webm: string };
}

export function optimizeCloudinaryUrl(url: string, kind: string): string {
  if (!url.includes('res.cloudinary.com') || url.includes('/f_auto,q_auto/')) {
    return url;
  }
  if (kind === 'image') {
    return url.replace('/upload/', '/upload/f_auto,q_auto/');
  }
  return url;
}

export function toMedia(row: MediaRow | null | undefined, ctx: SerializeContext): PublicMedia | null {
  if (!row || row.deletedAt) {
    return null;
  }
  const provider = ctx.lookups.code(row.providerId) ?? 'unknown';
  const kind = ctx.lookups.code(row.kindId) ?? 'unknown';
  const alt = pickLocale(row, 'alt', ctx.locale) ?? pickLocale(row, 'title', ctx.locale) ?? '';
  const url = provider === 'cloudinary' ? optimizeCloudinaryUrl(row.url, kind) : row.url;

  const result: PublicMedia = {
    id: row.id,
    url,
    width: row.width ?? null,
    height: row.height ?? null,
    alt,
    provider,
    kind,
    embedId: row.embedId ?? null,
    thumbnailUrl: row.thumbnailUrl ?? null,
    title: pickLocale(row, 'title', ctx.locale),
    captionsUrl: row.captionsUrl ?? null,
  };

  if (provider === 'cloudinary' && kind === 'video') {
    const baseWithoutExt = row.url.replace(/\.[a-zA-Z0-9]+$/, '');
    result.sources = { mp4: `${baseWithoutExt}.mp4`, webm: `${baseWithoutExt}.webm` };
  }
  return result;
}

export interface PublicImage {
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
}

function imageOf(
  ctx: SerializeContext,
  mediaId: string | null | undefined,
  fallbackAlt = '',
): PublicImage | null {
  const m = mediaId ? toMedia(ctx.media.get(mediaId), ctx) : null;
  return m ? { url: m.url, width: m.width, height: m.height, alt: m.alt || fallbackAlt } : null;
}

export function toBullets(rows: BulletRow[], locale: SupportedLocale): string[] {
  return [...rows]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => (locale === 'id' && r.textId?.trim() ? r.textId : r.textEn));
}

export function toMetrics(rows: ProjectMetricRow[], locale: SupportedLocale) {
  return [...rows]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => ({
      label: locale === 'id' && r.labelId?.trim() ? r.labelId : r.labelEn,
      value: r.value,
    }));
}

export interface PublicOrganization {
  slug: string;
  name: string;
  type: PublicLookup | null;
  logo: PublicImage | null;
  websiteUrl: string | null;
  location: string | null;
}

export function toOrganization(
  ctx: SerializeContext,
  id: string | null | undefined,
): PublicOrganization | null {
  const row = id ? ctx.organizations.get(id) : undefined;
  if (!row || row.deletedAt) return null;
  return {
    slug: row.slug,
    name: row.name,
    type: lookupOf(ctx, row.typeId),
    // Confidential organisations keep their (generic) name but expose nothing identifying.
    logo: row.isConfidential ? null : imageOf(ctx, row.logoMediaId, row.name),
    websiteUrl: row.isConfidential ? null : (row.websiteUrl ?? null),
    location: row.location ?? null,
  };
}

export interface PublicTechChip {
  name: string;
  slug: string;
  icon: string | null;
}

export function toTechChip(row: TechnologyRow): PublicTechChip {
  return { name: row.name, slug: row.slug, icon: row.icon ?? null };
}

export interface TechGroup {
  group: PublicLookup;
  items: PublicTechChip[];
}

/** Groups technologies by a lookup id, ordered like the lookup group. */
export function groupTechnologies(
  ctx: SerializeContext,
  items: { tech: TechnologyRow; groupId: string; sortOrder: number }[],
): TechGroup[] {
  const buckets = new Map<string, PublicTechChip[]>();
  for (const item of [...items].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const list = buckets.get(item.groupId) ?? [];
    list.push(toTechChip(item.tech));
    buckets.set(item.groupId, list);
  }
  return [...buckets.entries()]
    .map(([groupId, chips]) => ({ row: ctx.lookups.get(groupId), groupId, chips }))
    .sort((a, b) => (a.row?.sortOrder ?? 0) - (b.row?.sortOrder ?? 0))
    .map(({ groupId, chips }) => ({ group: requiredLookup(ctx, groupId), items: chips }));
}

export interface PublicProjectLink {
  type: PublicLookup;
  label: string;
  url: string | null;
  isPrivate: boolean;
}

export function toProjectLink(
  row: Pick<ProjectLinkRow, 'typeId' | 'label' | 'url' | 'isPrivate'>,
  ctx: SerializeContext,
): PublicProjectLink {
  return {
    type: requiredLookup(ctx, row.typeId),
    label: row.label,
    url: row.isPrivate ? null : (row.url ?? null),
    isPrivate: row.isPrivate,
  };
}

export interface PublicProjectRef {
  slug: string;
  title: string;
}

export interface PublicProjectCard {
  slug: string;
  title: string;
  summary: string;
  type: PublicLookup;
  state: PublicLookup;
  featured: boolean;
  client: PublicOrganization | null;
  cover: PublicImage | null;
  clip: PublicMedia | null;
  technologies: PublicTechChip[];
  primaryLink: PublicProjectLink | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export function toProjectCard(
  row: ProjectRow,
  ctx: SerializeContext,
  technologies: TechnologyRow[],
  links: ProjectLinkRow[],
  clipMediaId: string | null,
): PublicProjectCard {
  const sortedLinks = [...links].sort((a, b) => a.sortOrder - b.sortOrder);
  const primaryLinkRow = sortedLinks.find((l) => !l.isPrivate && l.url) ?? sortedLinks[0] ?? null;
  const title = pickLocale(row, 'title', ctx.locale) ?? row.titleEn;

  return {
    slug: row.slug,
    title,
    summary: pickLocale(row, 'summary', ctx.locale) ?? row.summaryEn,
    type: requiredLookup(ctx, row.typeId),
    state: requiredLookup(ctx, row.stateId),
    featured: row.featured,
    client: toOrganization(ctx, row.clientOrganizationId),
    cover: imageOf(ctx, row.coverMediaId, title),
    clip: clipMediaId ? toMedia(ctx.media.get(clipMediaId), ctx) : null,
    technologies: technologies.slice(0, 4).map(toTechChip),
    primaryLink: primaryLinkRow ? toProjectLink(primaryLinkRow, ctx) : null,
    periodStart: row.periodStart ?? null,
    periodEnd: row.periodEnd ?? null,
  };
}

export interface PublicProjectMediaItem extends PublicMedia {
  role: PublicLookup;
  caption: string | null;
}

/** A position the project belongs to (project ↔ experience is many-to-many). */
export interface PublicPositionRef {
  id: string;
  role: string;
  organization: PublicOrganization | null;
  startDate: string;
  endDate: string | null;
}

export function toPositionRef(row: ExperienceRow, ctx: SerializeContext): PublicPositionRef {
  return {
    id: row.id,
    role: pickLocale(row, 'role', ctx.locale) ?? row.roleEn,
    organization: toOrganization(ctx, row.organizationId),
    startDate: row.startDate,
    endDate: row.endDate ?? null,
  };
}

export function toProjectDetail(
  row: ProjectRow,
  ctx: SerializeContext,
  options: {
    technologies: { tech: TechnologyRow; groupId: string; sortOrder: number }[];
    links: ProjectLinkRow[];
    mediaItems: ProjectMediaRow[];
    metrics: ProjectMetricRow[];
    highlights: BulletRow[];
    responsibilities: BulletRow[];
    positions: ExperienceRow[];
    prev: PublicProjectRef | null;
    next: PublicProjectRef | null;
  },
) {
  const { locale } = ctx;
  const title = pickLocale(row, 'title', locale) ?? row.titleEn;
  const summary = pickLocale(row, 'summary', locale) ?? row.summaryEn;

  const media: PublicProjectMediaItem[] = [...options.mediaItems]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((relation) => {
      const m = toMedia(ctx.media.get(relation.mediaId), ctx);
      if (!m) return [];
      return [
        { ...m, role: requiredLookup(ctx, relation.roleId), caption: pickLocale(relation, 'caption', locale) },
      ];
    });

  return {
    slug: row.slug,
    title,
    summary,
    type: requiredLookup(ctx, row.typeId),
    state: requiredLookup(ctx, row.stateId),
    role: pickLocale(row, 'role', locale),
    teamSize: row.teamSize ?? null,
    client: toOrganization(ctx, row.clientOrganizationId),
    positions: [...options.positions]
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((p) => toPositionRef(p, ctx)),
    periodStart: row.periodStart ?? null,
    periodEnd: row.periodEnd ?? null,
    problem: pickLocale(row, 'problem', locale),
    solution: pickLocale(row, 'solution', locale),
    result: pickLocale(row, 'result', locale),
    challenges: pickLocale(row, 'challenges', locale),
    responsibilities: toBullets(options.responsibilities, locale),
    metrics: toMetrics(options.metrics, locale),
    highlights: toBullets(options.highlights, locale),
    technologies: groupTechnologies(ctx, options.technologies),
    links: [...options.links].sort((a, b) => a.sortOrder - b.sortOrder).map((l) => toProjectLink(l, ctx)),
    cover: imageOf(ctx, row.coverMediaId, title),
    architecture: imageOf(ctx, row.architectureMediaId, title),
    media,
    seo: {
      title: pickLocale(row, 'metaTitle', locale) ?? title,
      description: pickLocale(row, 'metaDescription', locale) ?? summary,
    },
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    prev: options.prev,
    next: options.next,
  };
}

export function toExperience(
  row: ExperienceRow,
  ctx: SerializeContext,
  related: {
    technologies: TechnologyRow[];
    responsibilities: BulletRow[];
    achievements: BulletRow[];
    projects: PublicProjectRef[];
  },
) {
  return {
    id: row.id,
    organization: toOrganization(ctx, row.organizationId),
    role: pickLocale(row, 'role', ctx.locale) ?? row.roleEn,
    employmentType: requiredLookup(ctx, row.employmentTypeId),
    location: row.location ?? null,
    workMode: lookupOf(ctx, row.workModeId),
    startDate: row.startDate,
    endDate: row.endDate ?? null,
    description: pickLocale(row, 'description', ctx.locale),
    responsibilities: toBullets(related.responsibilities, ctx.locale),
    achievements: toBullets(related.achievements, ctx.locale),
    technologies: related.technologies.map(toTechChip),
    projects: related.projects,
  };
}

export function toEducation(row: EducationRow, ctx: SerializeContext, activities: BulletRow[]) {
  return {
    id: row.id,
    organization: toOrganization(ctx, row.organizationId),
    degree: row.degree ?? null,
    field: pickLocale(row, 'field', ctx.locale),
    startDate: row.startDate ?? null,
    endDate: row.endDate ?? null,
    gpa: row.gpa ?? null,
    gpaScale: row.gpaScale ?? null,
    description: pickLocale(row, 'description', ctx.locale),
    activities: toBullets(activities, ctx.locale),
  };
}

/** Achievements, tools/skills, links and attachments (images, PDFs) of one certificate or activity. */
export function toExtras(ctx: SerializeContext, parentId: string, extras: RawExtras) {
  const own = <T extends { parentId: string; sortOrder: number }>(rows: T[]) =>
    rows.filter((r) => r.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    achievements: toBullets(own(extras.achievements), ctx.locale),
    technologies: own(extras.technologies).map((t) => toTechChip(t.tech)),
    links: own(extras.links).map((l) => toProjectLink(l, ctx)),
    attachments: own(extras.media).flatMap((relation) => {
      const m = toMedia(ctx.media.get(relation.mediaId), ctx);
      return m ? [{ ...m, caption: pickLocale(relation, 'caption', ctx.locale) }] : [];
    }),
  };
}

export function toCertification(
  row: CertificationRow,
  ctx: SerializeContext,
  extras: RawExtras,
  nowDate: Date = new Date(),
) {
  const todayIso = nowDate.toISOString().slice(0, 10);
  return {
    id: row.id,
    type: requiredLookup(ctx, row.typeId),
    name: row.name,
    issuer: toOrganization(ctx, row.issuerOrganizationId),
    issueDate: row.issueDate ?? null,
    expiryDate: row.expiryDate ?? null,
    isExpired: Boolean(row.expiryDate && row.expiryDate < todayIso),
    credentialId: row.credentialId ?? null,
    credentialUrl: row.credentialUrl ?? null,
    description: pickLocale(row, 'description', ctx.locale),
    image: imageOf(ctx, row.imageMediaId, row.name),
    featured: row.featured,
    ...toExtras(ctx, row.id, extras),
  };
}

export function toActivity(row: ActivityRow, ctx: SerializeContext, extras: RawExtras) {
  return {
    id: row.id,
    type: requiredLookup(ctx, row.typeId),
    organization: toOrganization(ctx, row.organizationId),
    eventName: row.eventName ?? null,
    role: pickLocale(row, 'role', ctx.locale) ?? row.roleEn,
    startDate: row.startDate ?? null,
    endDate: row.endDate ?? null,
    description: pickLocale(row, 'description', ctx.locale),
    media: imageOf(ctx, row.mediaId),
    linkUrl: row.linkUrl ?? null,
    ...toExtras(ctx, row.id, extras),
  };
}

export function toAchievement(row: AchievementRow, ctx: SerializeContext, extras: RawExtras) {
  return {
    id: row.id,
    title: pickLocale(row, 'title', ctx.locale) ?? row.titleEn,
    issuer: toOrganization(ctx, row.issuerOrganizationId),
    eventName: row.eventName ?? null,
    rank: row.rank ?? null,
    date: row.date ?? null,
    description: pickLocale(row, 'description', ctx.locale),
    certificate: imageOf(ctx, row.certificateMediaId),
    linkUrl: row.linkUrl ?? null,
    ...toExtras(ctx, row.id, extras),
  };
}

export function toPublication(row: PublicationRow, ctx: SerializeContext) {
  return {
    id: row.id,
    type: requiredLookup(ctx, row.typeId),
    title: row.title,
    venue: row.venue ?? null,
    date: row.date ?? null,
    summary: pickLocale(row, 'summary', ctx.locale),
    url: row.url ?? null,
    video: row.videoMediaId ? toMedia(ctx.media.get(row.videoMediaId), ctx) : null,
  };
}

export function toTestimonial(row: TestimonialRow, ctx: SerializeContext) {
  return {
    id: row.id,
    name: row.name,
    position: row.position ?? null,
    organization: toOrganization(ctx, row.organizationId),
    avatar: imageOf(ctx, row.avatarMediaId, row.name),
    relationship: row.relationship ?? null,
    quote: pickLocale(row, 'quote', ctx.locale) ?? row.quoteEn,
    linkedinUrl: row.linkedinUrl ?? null,
  };
}

export function toPublicProfile(
  row: ProfileRow | null | undefined,
  ctx: SerializeContext,
  related: {
    socials: ProfileSocialRow[];
    languages: ProfileLanguageRow[];
    interests: ProfileInterestRow[];
  },
) {
  if (!row) {
    return null;
  }
  const bySort = <T extends { sortOrder: number }>(rows: T[]) =>
    [...rows].sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    name: row.name,
    headline: pickLocale(row, 'headline', ctx.locale) ?? row.headlineEn,
    bio: pickLocale(row, 'bio', ctx.locale) ?? row.bioEn,
    avatar: imageOf(ctx, row.avatarMediaId, row.name),
    location: row.location ?? null,
    timezone: row.timezone,
    email: row.email ?? null,
    socials: bySort(related.socials).map((s) => ({
      platform: requiredLookup(ctx, s.platformId),
      url: s.url,
      handle: s.handle ?? null,
    })),
    availability: requiredLookup(ctx, row.availabilityId),
    workPreference: requiredLookup(ctx, row.workPreferenceId),
    languages: bySort(related.languages).map((l) => ({
      name: pickLocale(l, 'name', ctx.locale) ?? l.nameEn,
      level: requiredLookup(ctx, l.levelId),
    })),
    interests: bySort(related.interests).map((i) => ({
      label: pickLocale(i, 'label', ctx.locale) ?? i.labelEn,
      icon: i.icon ?? null,
    })),
    referencesNote: pickLocale(row, 'referencesNote', ctx.locale),
    careerStartDate: row.careerStartDate ?? null,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export interface PublicSiteSection {
  code: string;
  label: string;
  visible: boolean;
}

export function toPublicSettings(
  row: SiteSettingsRow | null | undefined,
  ctx: SerializeContext,
  sections: SiteSectionRow[],
) {
  return {
    themePreset: ctx.lookups.code(row?.themePresetId) ?? 'slate',
    colorMode: ctx.lookups.code(row?.colorModeId) ?? 'system',
    fontPair: ctx.lookups.code(row?.fontPairId) ?? 'geist',
    heroCvButtons: ctx.lookups.code(row?.heroCvButtonsId) ?? 'both',
    sections: [...sections]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .flatMap((s): PublicSiteSection[] => {
        const l = lookupOf(ctx, s.sectionId);
        return l ? [{ code: l.code, label: l.label, visible: s.isVisible }] : [];
      }),
    seo: {
      title: row ? pickLocale(row, 'seoTitle', ctx.locale) : null,
      description: row ? pickLocale(row, 'seoDescription', ctx.locale) : null,
      ogImage: imageOf(ctx, row?.ogMediaId),
    },
  };
}
