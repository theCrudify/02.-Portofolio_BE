import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const httpsUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith('https://'), 'URL must start with https://');

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const reorderSchema = z.object({
  ids: z
    .array(z.string().uuid())
    .min(1)
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length, 'Duplicate ids'),
});

export const projectCreateSchema = z
  .object({
    slug: z.string().min(1).max(120).regex(slugRegex, 'Invalid slug format'),
    titleId: z.string().min(1).max(160),
    titleEn: z.string().min(1).max(160),
    subtitleId: z.string().max(240).optional().nullable(),
    subtitleEn: z.string().max(240).optional().nullable(),
    summaryId: z.string().min(1).max(600),
    summaryEn: z.string().min(1).max(600),
    problemId: z.string().optional().nullable(),
    problemEn: z.string().optional().nullable(),
    solutionId: z.string().optional().nullable(),
    solutionEn: z.string().optional().nullable(),
    roleId: z.string().max(120).optional().nullable(),
    roleEn: z.string().max(120).optional().nullable(),
    teamSize: z.number().int().min(1).max(1000).optional().nullable(),
    durationMonths: z.number().int().min(1).max(240).optional().nullable(),
    clientOrContextId: z.string().max(160).optional().nullable(),
    clientOrContextEn: z.string().max(160).optional().nullable(),
    category: z.enum(['web', 'mobile', 'backend', 'ai', 'devops', 'design', 'other']).optional(),
    projectStatus: z.enum(['completed', 'in_progress', 'archived']).optional(),
    highlightsId: z.array(z.string().min(1).max(300)).max(20).optional(),
    highlightsEn: z.array(z.string().min(1).max(300)).max(20).optional(),
    metrics: z
      .array(
        z.object({
          label_id: z.string().min(1).max(120),
          label_en: z.string().min(1).max(120),
          value: z.string().min(1).max(80),
        })
      )
      .max(12)
      .optional(),
    coverMediaId: z.string().uuid().optional().nullable(),
    heroVideoMediaId: z.string().uuid().optional().nullable(),
    startedAt: dateStr.optional().nullable(),
    CompletedAt: dateStr.optional().nullable(),
    completedAt: dateStr.optional().nullable(),
    isFeatured: z.boolean().optional(),
    featuredOrder: z.number().int().optional().nullable(),
    sortOrder: z.number().int().optional(),
    confirmSlugChange: z.boolean().optional(),
  })
  .refine(
    (d) => {
      const end = d.completedAt ?? d.CompletedAt;
      if (d.startedAt && end) return end >= d.startedAt;
      return true;
    },
    { message: 'completedAt must be >= startedAt', path: ['completedAt'] }
  );

export const projectUpdateSchema = projectCreateSchema;

export const technologySchema = z.object({
  slug: z.string().min(1).max(80).regex(slugRegex),
  name: z.string().min(1).max(80),
  category: z.enum(['language', 'framework', 'database', 'devops', 'cloud', 'tool', 'other']),
  iconKey: z.string().max(80).optional().nullable(),
  iconMediaId: z.string().uuid().optional().nullable(),
  proficiency: z.number().int().min(1).max(5).optional().nullable(),
  yearsUsed: z.string().optional().nullable(),
  isHighlighted: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const experienceSchema = z
  .object({
    company: z.string().min(1).max(140),
    companyUrl: httpsUrl.optional().nullable(),
    companyLogoMediaId: z.string().uuid().optional().nullable(),
    roleId: z.string().min(1).max(140),
    roleEn: z.string().min(1).max(140),
    employmentType: z.enum([
      'full_time',
      'part_time',
      'contract',
      'freelance',
      'internship',
      'self_employed',
    ]),
    location: z.string().max(140).optional().nullable(),
    workMode: z.enum(['onsite', 'remote', 'hybrid']).optional().nullable(),
    startDate: dateStr,
    endDate: dateStr.optional().nullable(),
    isCurrent: z.boolean().optional(),
    summaryId: z.string().optional().nullable(),
    summaryEn: z.string().optional().nullable(),
    highlightsId: z.array(z.string().min(1).max(300)).max(20).optional(),
    highlightsEn: z.array(z.string().min(1).max(300)).max(20).optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((d) => (!d.endDate || d.endDate >= d.startDate) && !(d.isCurrent && d.endDate), {
    message: 'endDate must be >= startDate and null when isCurrent is true',
    path: ['endDate'],
  });

export const educationSchema = z
  .object({
    institution: z.string().min(1).max(160),
    institutionUrl: httpsUrl.optional().nullable(),
    logoMediaId: z.string().uuid().optional().nullable(),
    degreeId: z.string().min(1).max(140),
    degreeEn: z.string().min(1).max(140),
    fieldOfStudyId: z.string().max(140).optional().nullable(),
    fieldOfStudyEn: z.string().max(140).optional().nullable(),
    location: z.string().max(140).optional().nullable(),
    startDate: dateStr,
    endDate: dateStr.optional().nullable(),
    isCurrent: z.boolean().optional(),
    grade: z.string().max(40).optional().nullable(),
    descriptionId: z.string().optional().nullable(),
    descriptionEn: z.string().optional().nullable(),
    highlightsId: z.array(z.string().min(1).max(300)).max(20).optional(),
    highlightsEn: z.array(z.string().min(1).max(300)).max(20).optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, {
    message: 'endDate must be >= startDate',
    path: ['endDate'],
  });

export const certificationSchema = z
  .object({
    nameId: z.string().min(1).max(180),
    nameEn: z.string().min(1).max(180),
    issuer: z.string().min(1).max(140),
    issuerUrl: httpsUrl.optional().nullable(),
    badgeMediaId: z.string().uuid().optional().nullable(),
    certificateMediaId: z.string().uuid().optional().nullable(),
    issueDate: dateStr,
    expiryDate: dateStr.optional().nullable(),
    doesNotExpire: z.boolean().optional(),
    credentialId: z.string().max(120).optional().nullable(),
    credentialUrl: httpsUrl.optional().nullable(),
    descriptionId: z.string().optional().nullable(),
    descriptionEn: z.string().optional().nullable(),
    isFeatured: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((d) => !d.expiryDate || d.expiryDate >= d.issueDate, {
    message: 'expiryDate must be >= issueDate',
    path: ['expiryDate'],
  });

export const activitySchema = z
  .object({
    organization: z.string().min(1).max(160),
    organizationUrl: httpsUrl.optional().nullable(),
    logoMediaId: z.string().uuid().optional().nullable(),
    roleId: z.string().min(1).max(140),
    roleEn: z.string().min(1).max(140),
    activityType: z.enum(['organization', 'volunteer', 'community', 'speaking', 'mentoring']),
    location: z.string().max(140).optional().nullable(),
    startDate: dateStr,
    endDate: dateStr.optional().nullable(),
    isCurrent: z.boolean().optional(),
    descriptionId: z.string().optional().nullable(),
    descriptionEn: z.string().optional().nullable(),
    highlightsId: z.array(z.string().min(1).max(300)).max(20).optional(),
    highlightsEn: z.array(z.string().min(1).max(300)).max(20).optional(),
    proofUrl: httpsUrl.optional().nullable(),
    sortOrder: z.number().int().optional(),
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, {
    message: 'endDate must be >= startDate',
    path: ['endDate'],
  });

export const achievementSchema = z.object({
  titleId: z.string().min(1).max(180),
  titleEn: z.string().min(1).max(180),
  issuer: z.string().min(1).max(160),
  category: z
    .enum(['award', 'hackathon', 'competition', 'scholarship', 'recognition', 'other'])
    .optional(),
  level: z.enum(['international', 'national', 'regional', 'campus', 'organization']).optional().nullable(),
  achievedDate: dateStr,
  descriptionId: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  proofUrl: httpsUrl.optional().nullable(),
  mediaId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const publicationSchema = z.object({
  titleId: z.string().min(1).max(240),
  titleEn: z.string().min(1).max(240),
  publicationType: z
    .enum(['article', 'paper', 'book', 'talk', 'podcast', 'video'])
    .optional(),
  publisherOrVenue: z.string().max(180).optional().nullable(),
  publishedDate: dateStr,
  url: httpsUrl.optional().nullable(),
  doi: z.string().max(120).optional().nullable(),
  authors: z.array(z.string().min(1).max(120)).max(20).optional(),
  summaryId: z.string().optional().nullable(),
  summaryEn: z.string().optional().nullable(),
  coverMediaId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const testimonialSchema = z.object({
  authorName: z.string().min(1).max(120),
  authorRoleId: z.string().min(1).max(140),
  authorRoleEn: z.string().min(1).max(140),
  authorCompany: z.string().max(140).optional().nullable(),
  authorAvatarMediaId: z.string().uuid().optional().nullable(),
  authorLinkedinUrl: httpsUrl.optional().nullable(),
  relationshipId: z.string().max(120).optional().nullable(),
  relationshipEn: z.string().max(120).optional().nullable(),
  quoteId: z.string().min(1),
  quoteEn: z.string().min(1),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().min(1).max(120),
  headlineId: z.string().min(1).max(200),
  headlineEn: z.string().min(1).max(200),
  shortBioId: z.string().min(1).max(500),
  shortBioEn: z.string().min(1).max(500),
  longBioId: z.string().min(1),
  longBioEn: z.string().min(1),
  location: z.string().min(1).max(120),
  timezone: z.string().min(1).max(60).optional(),
  emailPublic: z.string().email().max(160),
  phonePublic: z.string().max(40).optional().nullable(),
  availableForHire: z.boolean().optional(),
  availabilityTextId: z.string().max(160).optional().nullable(),
  availabilityTextEn: z.string().max(160).optional().nullable(),
  avatarMediaId: z.string().uuid().optional().nullable(),
  heroMediaId: z.string().uuid().optional().nullable(),
  heroVideoMediaId: z.string().uuid().optional().nullable(),
  yearsOfExperience: z.number().int().min(0).max(80).optional(),
  socials: z
    .array(
      z.object({
        platform: z.enum([
          'github',
          'linkedin',
          'x',
          'instagram',
          'youtube',
          'dribbble',
          'behance',
          'medium',
          'devto',
          'scholar',
          'website',
          'other',
        ]),
        label: z.string().min(1).max(80),
        url: httpsUrl,
        handle: z.string().max(80).optional(),
      })
    )
    .max(15)
    .optional(),
  stats: z
    .array(
      z.object({
        label_id: z.string().min(1).max(80),
        label_en: z.string().min(1).max(80),
        value: z.string().min(1).max(40),
      })
    )
    .max(6)
    .optional(),
});

export const siteSettingsUpdateSchema = z.object({
  siteTitleId: z.string().min(1).max(70),
  siteTitleEn: z.string().min(1).max(70),
  siteDescriptionId: z.string().min(1).max(160),
  siteDescriptionEn: z.string().min(1).max(160),
  ogImageMediaId: z.string().uuid().optional().nullable(),
  faviconMediaId: z.string().uuid().optional().nullable(),
  defaultLocale: z.enum(['id', 'en']).optional(),
  defaultTheme: z.enum(['light', 'dark', 'system']).optional(),
  colorPreset: z.enum(['slate', 'forest', 'sunset', 'mono']).optional(),
  sectionOrder: z
    .array(
      z.object({
        key: z.enum([
          'hero',
          'about',
          'projects',
          'experiences',
          'skills',
          'education',
          'certifications',
          'activities',
          'achievements',
          'publications',
          'testimonials',
          'contact',
        ]),
        enabled: z.boolean(),
        order: z.number().int().min(0),
      })
    )
    .max(20)
    .optional(),
  heroCvButtons: z
    .object({
      showStandardCv: z.boolean(),
      showAtsCv: z.boolean(),
      showDynamicPdf: z.boolean(),
      primaryVariant: z.enum(['cv_standard', 'cv_ats', 'dynamic']),
    })
    .optional(),
  contactFormEnabled: z.boolean().optional(),
  notificationEmail: z.string().email().max(160).optional().nullable(),
  analyticsPublicSummary: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
});

export const projectTechnologiesSchema = z.object({
  items: z
    .array(
      z.object({
        technologyId: z.string().uuid(),
        isPrimary: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .max(30),
});

export const projectLinksSchema = z.object({
  items: z
    .array(
      z.object({
        linkType: z.enum([
          'live',
          'repo',
          'case_study',
          'figma',
          'docs',
          'playstore',
          'appstore',
          'video',
          'other',
        ]),
        labelId: z.string().min(1).max(80),
        labelEn: z.string().min(1).max(80),
        url: httpsUrl,
        sortOrder: z.number().int().optional(),
      })
    )
    .max(15),
});

export const projectMediaSchema = z.object({
  items: z
    .array(
      z.object({
        mediaId: z.string().uuid(),
        captionId: z.string().max(240).optional().nullable(),
        captionEn: z.string().max(240).optional().nullable(),
        displayKind: z.enum(['gallery', 'before_after', 'video', 'architecture']).optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .max(30),
});

export const experienceTechnologiesSchema = z.object({
  technologyIds: z.array(z.string().uuid()).max(30),
});

