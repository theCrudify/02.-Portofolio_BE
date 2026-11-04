import { z } from 'zod';

/*
 * Admin payloads. Field names are the Drizzle property names of src/db/schema.ts, so a parsed
 * payload maps 1:1 onto columns. `*Id` fields that point at `lookups` are lookup ids (the admin
 * picks them from master data); the resource registry checks each belongs to the right group.
 * Child collections (responsibilities, links, media…) ride along in the same payload and replace
 * the stored rows when present.
 */

export const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slug = z.string().min(1).max(80).regex(slugRegex, 'Invalid slug format');
const uuid = z.string().uuid();
const optUuid = uuid.optional().nullable();
const httpsUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith('https://'), 'URL must start with https://');
const optUrl = httpsUrl.optional().nullable();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
const optDate = dateStr.optional().nullable();
const optText = (max?: number) => (max ? z.string().max(max) : z.string()).optional().nullable();
const reqText = (max: number) => z.string().min(1).max(max);
const sortOrder = z.number().int().min(0).optional();

export const reorderSchema = z.object({
  ids: z
    .array(uuid)
    .min(1)
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length, 'Duplicate ids'),
});

/* ---------- child collections ---------- */

export const bulletItem = z.object({ textEn: reqText(500), textId: optText(500) });
const bullets = z.array(bulletItem).max(30);

export const childSchemas = {
  responsibilities: bullets,
  highlights: bullets,
  achievements: bullets,
  activities: bullets,
  metrics: z
    .array(z.object({ labelEn: reqText(120), labelId: optText(120), value: reqText(60) }))
    .max(12),
  projectTechnologies: z.array(z.object({ technologyId: uuid, groupId: uuid })).max(40),
  links: z
    .array(
      z.object({
        typeId: uuid,
        label: reqText(80),
        url: optUrl,
        isPrivate: z.boolean().default(false),
      }),
    )
    .max(20)
    .refine((items) => items.every((l) => l.isPrivate || l.url), 'Public links need a URL'),
  media: z
    .array(
      z.object({
        mediaId: uuid,
        roleId: uuid,
        captionEn: optText(200),
        captionId: optText(200),
      }),
    )
    .max(40),
  experienceIds: z.array(z.object({ experienceId: uuid })).max(20),
  projectIds: z.array(z.object({ projectId: uuid })).max(100),
  technologyIds: z.array(z.object({ technologyId: uuid })).max(40),
  socials: z
    .array(z.object({ platformId: uuid, url: httpsUrl, handle: optText(100) }))
    .max(20),
  languages: z
    .array(z.object({ nameEn: reqText(60), nameId: optText(60), levelId: uuid }))
    .max(20),
  interests: z
    .array(z.object({ labelEn: reqText(80), labelId: optText(80), icon: optText(60) }))
    .max(30),
  sections: z.array(z.object({ sectionId: uuid, isVisible: z.boolean() })).max(40),
};

/* ---------- resources ---------- */

const projectFields = {
  slug,
  titleEn: reqText(120),
  titleId: optText(120),
  summaryEn: reqText(200),
  summaryId: optText(200),
  typeId: uuid,
  stateId: uuid,
  roleEn: optText(120),
  roleId: optText(120),
  teamSize: z.number().int().min(1).max(1000).optional().nullable(),
  clientOrganizationId: optUuid,
  periodStart: optDate,
  periodEnd: optDate,
  problemEn: optText(),
  problemId: optText(),
  solutionEn: optText(),
  solutionId: optText(),
  resultEn: optText(),
  resultId: optText(),
  challengesEn: optText(),
  challengesId: optText(),
  coverMediaId: optUuid,
  architectureMediaId: optUuid,
  featured: z.boolean().optional(),
  metaTitleEn: optText(70),
  metaTitleId: optText(70),
  metaDescriptionEn: optText(160),
  metaDescriptionId: optText(160),
  sortOrder,
  // children
  responsibilities: childSchemas.responsibilities.optional(),
  highlights: childSchemas.highlights.optional(),
  metrics: childSchemas.metrics.optional(),
  technologies: childSchemas.projectTechnologies.optional(),
  links: childSchemas.links.optional(),
  media: childSchemas.media.optional(),
  experiences: childSchemas.experienceIds.optional(),
};
export const projectCreateSchema = z.object(projectFields);
export const projectUpdateSchema = z
  .object(projectFields)
  .partial()
  .extend({ confirmSlugChange: z.boolean().optional() });

const technologyFields = {
  name: reqText(60),
  slug: slug.max(60),
  categoryId: uuid,
  icon: optText(120),
  showOnSkills: z.boolean().optional(),
  sortOrder,
};
export const technologySchema = z.object(technologyFields);

const organizationFields = {
  name: reqText(160),
  slug: slug.max(160),
  typeId: uuid,
  logoMediaId: optUuid,
  websiteUrl: optUrl,
  location: optText(100),
  descriptionEn: optText(),
  descriptionId: optText(),
  isConfidential: z.boolean().optional(),
  sortOrder,
};
export const organizationSchema = z.object(organizationFields);

const experienceFields = {
  organizationId: uuid,
  roleEn: reqText(100),
  roleId: optText(100),
  employmentTypeId: uuid,
  location: optText(100),
  workModeId: optUuid,
  startDate: dateStr,
  endDate: optDate,
  descriptionEn: optText(),
  descriptionId: optText(),
  sortOrder,
  responsibilities: childSchemas.responsibilities.optional(),
  achievements: childSchemas.achievements.optional(),
  technologies: childSchemas.technologyIds.optional(),
  projects: childSchemas.projectIds.optional(),
};
export const experienceSchema = z.object(experienceFields);

const educationFields = {
  organizationId: uuid,
  degree: optText(100),
  fieldEn: optText(120),
  fieldId: optText(120),
  startDate: optDate,
  endDate: optDate,
  gpa: z.string().regex(/^\d{1,2}(\.\d{1,2})?$/).optional().nullable(),
  gpaScale: z.string().regex(/^\d{1,2}(\.\d{1,2})?$/).optional().nullable(),
  descriptionEn: optText(),
  descriptionId: optText(),
  sortOrder,
  activities: childSchemas.activities.optional(),
};
export const educationSchema = z.object(educationFields);

const certificationFields = {
  typeId: uuid,
  name: reqText(160),
  issuerOrganizationId: uuid,
  issueDate: optDate,
  expiryDate: optDate,
  credentialId: optText(120),
  credentialUrl: optUrl,
  imageMediaId: optUuid,
  featured: z.boolean().optional(),
  sortOrder,
};
export const certificationSchema = z.object(certificationFields);

const activityFields = {
  typeId: uuid,
  organizationId: uuid,
  eventName: optText(160),
  roleEn: reqText(100),
  roleId: optText(100),
  startDate: optDate,
  endDate: optDate,
  descriptionEn: optText(),
  descriptionId: optText(),
  mediaId: optUuid,
  linkUrl: optUrl,
  sortOrder,
  achievements: childSchemas.achievements.optional(),
};
export const activitySchema = z.object(activityFields);

const achievementFields = {
  titleEn: reqText(160),
  titleId: optText(160),
  issuerOrganizationId: optUuid,
  eventName: optText(160),
  rank: optText(60),
  date: optDate,
  descriptionEn: optText(),
  descriptionId: optText(),
  certificateMediaId: optUuid,
  linkUrl: optUrl,
  sortOrder,
};
export const achievementSchema = z.object(achievementFields);

const publicationFields = {
  typeId: uuid,
  title: reqText(200),
  venue: optText(160),
  date: optDate,
  summaryEn: optText(),
  summaryId: optText(),
  url: optUrl,
  videoMediaId: optUuid,
  sortOrder,
};
export const publicationSchema = z.object(publicationFields);

const testimonialFields = {
  name: reqText(100),
  position: optText(100),
  organizationId: optUuid,
  avatarMediaId: optUuid,
  relationship: optText(100),
  quoteEn: reqText(2000),
  quoteId: optText(2000),
  linkedinUrl: optUrl,
  sortOrder,
};
export const testimonialSchema = z.object(testimonialFields);

/** Update payloads accept any subset of the create fields. */
export const partialOf = <T extends z.ZodRawShape>(shape: T) => z.object(shape).partial();
export const updateSchemas = {
  technologies: partialOf(technologyFields),
  organizations: partialOf(organizationFields),
  experiences: partialOf(experienceFields),
  education: partialOf(educationFields),
  certifications: partialOf(certificationFields),
  activities: partialOf(activityFields),
  achievements: partialOf(achievementFields),
  publications: partialOf(publicationFields),
  testimonials: partialOf(testimonialFields),
};

/* ---------- singletons ---------- */

export const profileUpdateSchema = z
  .object({
    name: reqText(100),
    headlineEn: reqText(160),
    headlineId: optText(160),
    bioEn: reqText(5000),
    bioId: optText(5000),
    avatarMediaId: optUuid,
    location: optText(100),
    timezone: reqText(64),
    email: z.string().email().max(254).optional().nullable(),
    availabilityId: uuid,
    workPreferenceId: uuid,
    referencesNoteEn: optText(300),
    referencesNoteId: optText(300),
    careerStartDate: optDate,
    socials: childSchemas.socials.optional(),
    languages: childSchemas.languages.optional(),
    interests: childSchemas.interests.optional(),
  })
  .partial();

export const siteSettingsUpdateSchema = z
  .object({
    themePresetId: uuid,
    colorModeId: uuid,
    fontPairId: uuid,
    heroCvButtonsId: uuid,
    seoTitleEn: optText(70),
    seoTitleId: optText(70),
    seoDescriptionEn: optText(160),
    seoDescriptionId: optText(160),
    ogMediaId: optUuid,
    sections: childSchemas.sections.optional(),
  })
  .partial();

/* ---------- master data ---------- */

export const lookupCreateSchema = z.object({
  groupId: uuid,
  code: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/, 'Use lowercase letters, digits, _ or -'),
  labelEn: reqText(120),
  labelId: optText(120),
  icon: optText(60),
  color: optText(40),
  isActive: z.boolean().optional(),
  sortOrder,
});
// Codes are what code paths match on, so they can't change after creation.
export const lookupUpdateSchema = lookupCreateSchema.omit({ groupId: true, code: true }).partial();
