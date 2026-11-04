import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  smallint,
  boolean,
  timestamp,
  date,
  jsonb,
  numeric,
  index,
  uniqueIndex,
  primaryKey,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

/*
 * No Postgres enums and no array/object columns: every closed list of values lives in
 * `lookups` (grouped by `lookup_groups`), and every repeating value is its own row in a
 * child table. Code refers to lookup rows by (group code, value code); see
 * src/services/lookup.service.ts.
 */

/* ---------- Helpers ---------- */
const id = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7());
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
const lookupRef = (name: string) =>
  uuid(name).references(() => lookups.id, { onDelete: 'restrict' });
const contentColumns = {
  statusId: lookupRef('status_id').notNull(), // lookup group: content_status
  publishedAt: timestamp('published_at', { withTimezone: true }),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};
const mediaRef = (name: string) => uuid(name).references(() => media.id, { onDelete: 'set null' });
const orgRef = (name: string) =>
  uuid(name).references(() => organizations.id, { onDelete: 'set null' });
/** Bilingual bullet row owned by a parent (responsibilities, highlights, achievements…). */
const bulletColumns = {
  textEn: text('text_en').notNull(),
  textId: text('text_id'),
  sortOrder: integer('sort_order').notNull().default(0),
};

/* ---------- 0. Master data ---------- */
export const lookupGroups = pgTable(
  'lookup_groups',
  {
    id: id(),
    code: varchar('code', { length: 60 }).notNull(),
    nameEn: varchar('name_en', { length: 100 }).notNull(),
    nameId: varchar('name_id', { length: 100 }),
    descriptionEn: varchar('description_en', { length: 300 }),
    descriptionId: varchar('description_id', { length: 300 }),
    isSystem: boolean('is_system').notNull().default(false), // values drive code; rows can't be deleted
    ...timestamps,
  },
  (t) => [uniqueIndex('lookup_groups_code_uq').on(t.code)],
);

export const lookups = pgTable(
  'lookups',
  {
    id: id(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => lookupGroups.id, { onDelete: 'restrict' }),
    code: varchar('code', { length: 60 }).notNull(),
    labelEn: varchar('label_en', { length: 120 }).notNull(),
    labelId: varchar('label_id', { length: 120 }),
    icon: varchar('icon', { length: 60 }),
    color: varchar('color', { length: 40 }), // design token name, e.g. "warning"
    isSystem: boolean('is_system').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('lookups_group_code_uq').on(t.groupId, t.code),
    index('lookups_group_sort_idx').on(t.groupId, t.sortOrder),
  ],
);

/* ---------- A. Access & security ---------- */
export const users = pgTable(
  'users',
  {
    id: id(),
    email: varchar('email', { length: 254 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    passwordHash: text('password_hash').notNull(), // pbkdf2$sha256$<iterations>$<saltB64>$<hashB64>
    roleId: lookupRef('role_id').notNull(), // user_role
    totpSecret: text('totp_secret'),
    totpEnabled: boolean('totp_enabled').notNull().default(false),
    tokenVersion: integer('token_version').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('users_email_uq').on(sql`lower(${t.email})`)],
);

export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: id(),
    ipHash: varchar('ip_hash', { length: 64 }).notNull(),
    email: varchar('email', { length: 254 }),
    success: boolean('success').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('login_attempts_ip_time_idx').on(t.ipHash, t.createdAt)],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    actionId: lookupRef('action_id').notNull(), // audit_action
    resource: varchar('resource', { length: 40 }).notNull(),
    resourceId: varchar('resource_id', { length: 64 }),
    summary: varchar('summary', { length: 300 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_time_idx').on(t.createdAt),
    index('audit_logs_user_idx').on(t.userId),
  ],
);

/* ---------- Media (declared early: referenced everywhere) ---------- */
export const media = pgTable(
  'media',
  {
    id: id(),
    providerId: lookupRef('provider_id').notNull(), // media_provider
    kindId: lookupRef('kind_id').notNull(), // media_kind
    publicId: varchar('public_id', { length: 255 }),
    embedId: varchar('embed_id', { length: 64 }),
    url: text('url').notNull(),
    mime: varchar('mime', { length: 100 }),
    width: integer('width'),
    height: integer('height'),
    bytes: integer('bytes'),
    durationSec: integer('duration_sec'),
    thumbnailUrl: text('thumbnail_url'),
    captionsUrl: text('captions_url'),
    titleEn: varchar('title_en', { length: 160 }),
    titleId: varchar('title_id', { length: 160 }),
    altEn: varchar('alt_en', { length: 300 }),
    altId: varchar('alt_id', { length: 300 }),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('media_kind_idx').on(t.kindId), index('media_time_idx').on(t.createdAt)],
);

/* ---------- Organizations (companies, campuses, issuers, communities, clients) ---------- */
export const organizations = pgTable(
  'organizations',
  {
    id: id(),
    name: varchar('name', { length: 160 }).notNull(),
    slug: varchar('slug', { length: 160 }).notNull(),
    typeId: lookupRef('type_id').notNull(), // organization_type
    logoMediaId: mediaRef('logo_media_id'),
    websiteUrl: text('website_url'),
    location: varchar('location', { length: 100 }),
    descriptionEn: text('description_en'),
    descriptionId: text('description_id'),
    isConfidential: boolean('is_confidential').notNull().default(false), // show a generic label publicly
    ...contentColumns,
    ...timestamps,
  },
  (t) => [
    uniqueIndex('organizations_slug_uq').on(t.slug),
    index('organizations_type_idx').on(t.typeId),
  ],
);

/* ---------- B. Profile & settings ---------- */
export const profile = pgTable('profile', {
  id: smallint('id').primaryKey().default(1),
  name: varchar('name', { length: 100 }).notNull(),
  headlineEn: varchar('headline_en', { length: 160 }).notNull(),
  headlineId: varchar('headline_id', { length: 160 }),
  bioEn: text('bio_en').notNull(),
  bioId: text('bio_id'),
  avatarMediaId: mediaRef('avatar_media_id'),
  location: varchar('location', { length: 100 }),
  timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Jakarta'),
  email: varchar('email', { length: 254 }),
  availabilityId: lookupRef('availability_id').notNull(), // availability
  workPreferenceId: lookupRef('work_preference_id').notNull(), // work_mode
  referencesNoteEn: varchar('references_note_en', { length: 300 }),
  referencesNoteId: varchar('references_note_id', { length: 300 }),
  careerStartDate: date('career_start_date'),
  ...timestamps,
});

const profileRef = () =>
  smallint('profile_id')
    .notNull()
    .default(1)
    .references(() => profile.id, { onDelete: 'cascade' });

export const profileSocials = pgTable(
  'profile_socials',
  {
    id: id(),
    profileId: profileRef(),
    platformId: lookupRef('platform_id').notNull(), // social_platform
    url: text('url').notNull(),
    handle: varchar('handle', { length: 100 }),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex('profile_socials_platform_uq').on(t.profileId, t.platformId)],
);

export const profileLanguages = pgTable('profile_languages', {
  id: id(),
  profileId: profileRef(),
  nameEn: varchar('name_en', { length: 60 }).notNull(),
  nameId: varchar('name_id', { length: 60 }),
  levelId: lookupRef('level_id').notNull(), // language_level
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
});

export const profileInterests = pgTable('profile_interests', {
  id: id(),
  profileId: profileRef(),
  labelEn: varchar('label_en', { length: 80 }).notNull(),
  labelId: varchar('label_id', { length: 80 }),
  icon: varchar('icon', { length: 60 }),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
});

export const siteSettings = pgTable('site_settings', {
  id: smallint('id').primaryKey().default(1),
  themePresetId: lookupRef('theme_preset_id').notNull(), // theme_preset
  colorModeId: lookupRef('color_mode_id').notNull(), // color_mode
  fontPairId: lookupRef('font_pair_id').notNull(), // font_pair
  heroCvButtonsId: lookupRef('hero_cv_buttons_id').notNull(), // hero_cv_buttons
  seoTitleEn: varchar('seo_title_en', { length: 70 }),
  seoTitleId: varchar('seo_title_id', { length: 70 }),
  seoDescriptionEn: varchar('seo_description_en', { length: 160 }),
  seoDescriptionId: varchar('seo_description_id', { length: 160 }),
  ogMediaId: mediaRef('og_media_id'),
  ...timestamps,
});

/** Home page sections: order and visibility (one row per site_section lookup). */
export const siteSections = pgTable('site_sections', {
  sectionId: uuid('section_id')
    .primaryKey()
    .references(() => lookups.id, { onDelete: 'cascade' }), // site_section
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: boolean('is_visible').notNull().default(true),
  ...timestamps,
});

/* ---------- C. Content ---------- */
export const technologies = pgTable(
  'technologies',
  {
    id: id(),
    name: varchar('name', { length: 60 }).notNull(),
    slug: varchar('slug', { length: 60 }).notNull(),
    categoryId: lookupRef('category_id').notNull(), // tech_category
    icon: varchar('icon', { length: 120 }), // simple-icons slug or full URL
    showOnSkills: boolean('show_on_skills').notNull().default(true),
    ...contentColumns,
    ...timestamps,
  },
  (t) => [
    uniqueIndex('technologies_slug_uq').on(t.slug),
    index('technologies_status_idx').on(t.statusId, t.sortOrder),
  ],
);

export const projects = pgTable(
  'projects',
  {
    id: id(),
    slug: varchar('slug', { length: 80 }).notNull(),
    titleEn: varchar('title_en', { length: 120 }).notNull(),
    titleId: varchar('title_id', { length: 120 }),
    summaryEn: varchar('summary_en', { length: 200 }).notNull(),
    summaryId: varchar('summary_id', { length: 200 }),
    typeId: lookupRef('type_id').notNull(), // project_type
    stateId: lookupRef('state_id').notNull(), // project_state
    roleEn: varchar('role_en', { length: 120 }),
    roleId: varchar('role_id', { length: 120 }),
    teamSize: smallint('team_size'),
    clientOrganizationId: orgRef('client_organization_id'),
    periodStart: date('period_start'),
    periodEnd: date('period_end'),
    problemEn: text('problem_en'),
    problemId: text('problem_id'),
    solutionEn: text('solution_en'),
    solutionId: text('solution_id'),
    resultEn: text('result_en'),
    resultId: text('result_id'),
    challengesEn: text('challenges_en'),
    challengesId: text('challenges_id'),
    coverMediaId: mediaRef('cover_media_id'),
    architectureMediaId: mediaRef('architecture_media_id'),
    featured: boolean('featured').notNull().default(false),
    metaTitleEn: varchar('meta_title_en', { length: 70 }),
    metaTitleId: varchar('meta_title_id', { length: 70 }),
    metaDescriptionEn: varchar('meta_description_en', { length: 160 }),
    metaDescriptionId: varchar('meta_description_id', { length: 160 }),
    ...contentColumns,
    ...timestamps,
  },
  (t) => [
    uniqueIndex('projects_slug_uq').on(t.slug),
    index('projects_status_idx').on(t.statusId, t.sortOrder),
    index('projects_featured_idx').on(t.featured),
    index('projects_client_idx').on(t.clientOrganizationId),
  ],
);

const projectRef = () =>
  uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' });

/** Job descriptions on a project — usually several. */
export const projectResponsibilities = pgTable(
  'project_responsibilities',
  { id: id(), projectId: projectRef(), ...bulletColumns, ...timestamps },
  (t) => [index('project_responsibilities_project_idx').on(t.projectId, t.sortOrder)],
);

export const projectHighlights = pgTable(
  'project_highlights',
  { id: id(), projectId: projectRef(), ...bulletColumns, ...timestamps },
  (t) => [index('project_highlights_project_idx').on(t.projectId, t.sortOrder)],
);

export const projectMetrics = pgTable(
  'project_metrics',
  {
    id: id(),
    projectId: projectRef(),
    labelEn: varchar('label_en', { length: 120 }).notNull(),
    labelId: varchar('label_id', { length: 120 }),
    value: varchar('value', { length: 60 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('project_metrics_project_idx').on(t.projectId, t.sortOrder)],
);

export const projectTechnologies = pgTable(
  'project_technologies',
  {
    projectId: projectRef(),
    technologyId: uuid('technology_id')
      .notNull()
      .references(() => technologies.id, { onDelete: 'cascade' }),
    groupId: lookupRef('group_id').notNull(), // tech_group
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.technologyId] }),
    index('pt_tech_idx').on(t.technologyId),
  ],
);

/** Repos (FE / BE / integration services), demos, docs, slides… */
export const projectLinks = pgTable(
  'project_links',
  {
    id: id(),
    projectId: projectRef(),
    typeId: lookupRef('type_id').notNull(), // link_type
    label: varchar('label', { length: 80 }).notNull(),
    url: text('url'), // null when is_private
    isPrivate: boolean('is_private').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('project_links_project_idx').on(t.projectId)],
);

/** Images, PDFs, slide decks and videos attached to a project. */
export const projectMedia = pgTable(
  'project_media',
  {
    id: id(),
    projectId: projectRef(),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    roleId: lookupRef('role_id').notNull(), // project_media_role
    captionEn: varchar('caption_en', { length: 200 }),
    captionId: varchar('caption_id', { length: 200 }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    index('project_media_project_idx').on(t.projectId),
    index('project_media_media_idx').on(t.mediaId),
  ],
);

export const experiences = pgTable(
  'experiences',
  {
    id: id(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    roleEn: varchar('role_en', { length: 100 }).notNull(),
    roleId: varchar('role_id', { length: 100 }),
    employmentTypeId: lookupRef('employment_type_id').notNull(), // employment_type
    location: varchar('location', { length: 100 }),
    workModeId: lookupRef('work_mode_id'), // work_mode
    startDate: date('start_date').notNull(),
    endDate: date('end_date'), // null = current
    descriptionEn: text('description_en'),
    descriptionId: text('description_id'),
    ...contentColumns,
    ...timestamps,
  },
  (t) => [
    index('experiences_status_idx').on(t.statusId, t.sortOrder),
    index('experiences_org_idx').on(t.organizationId),
  ],
);

const experienceRef = () =>
  uuid('experience_id')
    .notNull()
    .references(() => experiences.id, { onDelete: 'cascade' });

/** Job descriptions for the position as a whole. */
export const experienceResponsibilities = pgTable(
  'experience_responsibilities',
  { id: id(), experienceId: experienceRef(), ...bulletColumns, ...timestamps },
  (t) => [index('experience_responsibilities_exp_idx').on(t.experienceId, t.sortOrder)],
);

export const experienceAchievements = pgTable(
  'experience_achievements',
  { id: id(), experienceId: experienceRef(), ...bulletColumns, ...timestamps },
  (t) => [index('experience_achievements_exp_idx').on(t.experienceId, t.sortOrder)],
);

/** A project can span several positions (e.g. internship → full-time at the same company). */
export const experienceProjects = pgTable(
  'experience_projects',
  {
    experienceId: experienceRef(),
    projectId: projectRef(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.experienceId, t.projectId] }),
    index('ep_project_idx').on(t.projectId),
  ],
);

export const experienceTechnologies = pgTable(
  'experience_technologies',
  {
    experienceId: experienceRef(),
    technologyId: uuid('technology_id')
      .notNull()
      .references(() => technologies.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.experienceId, t.technologyId] }),
    index('et_tech_idx').on(t.technologyId),
  ],
);

export const education = pgTable(
  'education',
  {
    id: id(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    degree: varchar('degree', { length: 100 }),
    fieldEn: varchar('field_en', { length: 120 }),
    fieldId: varchar('field_id', { length: 120 }),
    startDate: date('start_date'),
    endDate: date('end_date'),
    gpa: numeric('gpa', { precision: 4, scale: 2 }),
    gpaScale: numeric('gpa_scale', { precision: 4, scale: 2 }),
    descriptionEn: text('description_en'),
    descriptionId: text('description_id'),
    ...contentColumns,
    ...timestamps,
  },
  (t) => [index('education_status_idx').on(t.statusId, t.sortOrder)],
);

export const educationActivities = pgTable(
  'education_activities',
  {
    id: id(),
    educationId: uuid('education_id')
      .notNull()
      .references(() => education.id, { onDelete: 'cascade' }),
    ...bulletColumns,
    ...timestamps,
  },
  (t) => [index('education_activities_edu_idx').on(t.educationId, t.sortOrder)],
);

export const certifications = pgTable(
  'certifications',
  {
    id: id(),
    typeId: lookupRef('type_id').notNull(), // cert_type
    name: varchar('name', { length: 160 }).notNull(),
    issuerOrganizationId: uuid('issuer_organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    issueDate: date('issue_date'),
    expiryDate: date('expiry_date'),
    credentialId: varchar('credential_id', { length: 120 }),
    credentialUrl: text('credential_url'),
    descriptionEn: text('description_en'),
    descriptionId: text('description_id'),
    imageMediaId: mediaRef('image_media_id'),
    featured: boolean('featured').notNull().default(false),
    ...contentColumns,
    ...timestamps,
  },
  (t) => [
    index('certifications_status_idx').on(t.statusId, t.sortOrder),
    index('certifications_issuer_idx').on(t.issuerOrganizationId),
  ],
);

export const activities = pgTable(
  'activities',
  {
    id: id(),
    typeId: lookupRef('type_id').notNull(), // activity_type
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    eventName: varchar('event_name', { length: 160 }),
    roleEn: varchar('role_en', { length: 100 }).notNull(),
    roleId: varchar('role_id', { length: 100 }),
    startDate: date('start_date'),
    endDate: date('end_date'),
    descriptionEn: text('description_en'),
    descriptionId: text('description_id'),
    mediaId: mediaRef('media_id'),
    linkUrl: text('link_url'),
    ...contentColumns,
    ...timestamps,
  },
  (t) => [index('activities_status_idx').on(t.statusId, t.sortOrder)],
);

export const activityAchievements = pgTable(
  'activity_achievements',
  {
    id: id(),
    activityId: uuid('activity_id')
      .notNull()
      .references(() => activities.id, { onDelete: 'cascade' }),
    ...bulletColumns,
    ...timestamps,
  },
  (t) => [index('activity_achievements_act_idx').on(t.activityId, t.sortOrder)],
);

/*
 * Attachments, links and tools/skills of a certificate or an activity. Same shape as the
 * project tables; one table per parent so foreign keys cascade.
 */
const parentRef = (column: string, parent: () => AnyPgColumn) =>
  uuid(column).notNull().references(parent, { onDelete: 'cascade' });
const linkTable = (name: string, parentKey: string, parent: () => AnyPgColumn) =>
  pgTable(
    name,
    {
      id: id(),
      parentId: parentRef(parentKey, parent),
      typeId: lookupRef('type_id').notNull(), // link_type
      label: varchar('label', { length: 80 }).notNull(),
      url: text('url'),
      isPrivate: boolean('is_private').notNull().default(false),
      sortOrder: integer('sort_order').notNull().default(0),
      ...timestamps,
    },
    (t) => [index(`${name}_parent_idx`).on(t.parentId)],
  );
const mediaTable = (name: string, parentKey: string, parent: () => AnyPgColumn) =>
  pgTable(
    name,
    {
      id: id(),
      parentId: parentRef(parentKey, parent),
      mediaId: uuid('media_id')
        .notNull()
        .references(() => media.id, { onDelete: 'cascade' }),
      captionEn: varchar('caption_en', { length: 200 }),
      captionId: varchar('caption_id', { length: 200 }),
      sortOrder: integer('sort_order').notNull().default(0),
    },
    (t) => [index(`${name}_parent_idx`).on(t.parentId), index(`${name}_media_idx`).on(t.mediaId)],
  );
const techTable = (name: string, parentKey: string, parent: () => AnyPgColumn) =>
  pgTable(
    name,
    {
      parentId: parentRef(parentKey, parent),
      technologyId: uuid('technology_id')
        .notNull()
        .references(() => technologies.id, { onDelete: 'cascade' }),
      sortOrder: integer('sort_order').notNull().default(0),
    },
    (t) => [
      primaryKey({ columns: [t.parentId, t.technologyId] }),
      index(`${name}_tech_idx`).on(t.technologyId),
    ],
  );

export const certificationAchievements = pgTable(
  'certification_achievements',
  {
    id: id(),
    certificationId: parentRef('certification_id', () => certifications.id),
    ...bulletColumns,
    ...timestamps,
  },
  (t) => [index('certification_achievements_cert_idx').on(t.certificationId, t.sortOrder)],
);
export const certificationLinks = linkTable('certification_links', 'certification_id', () => certifications.id);
export const certificationMedia = mediaTable('certification_media', 'certification_id', () => certifications.id);
export const certificationTechnologies = techTable(
  'certification_technologies',
  'certification_id',
  () => certifications.id,
);
export const activityLinks = linkTable('activity_links', 'activity_id', () => activities.id);
export const activityMedia = mediaTable('activity_media', 'activity_id', () => activities.id);
export const activityTechnologies = techTable('activity_technologies', 'activity_id', () => activities.id);

export const achievements = pgTable(
  'achievements',
  {
    id: id(),
    titleEn: varchar('title_en', { length: 160 }).notNull(),
    titleId: varchar('title_id', { length: 160 }),
    issuerOrganizationId: orgRef('issuer_organization_id'),
    eventName: varchar('event_name', { length: 160 }),
    rank: varchar('rank', { length: 60 }),
    date: date('date'),
    descriptionEn: text('description_en'),
    descriptionId: text('description_id'),
    certificateMediaId: mediaRef('certificate_media_id'),
    linkUrl: text('link_url'),
    ...contentColumns,
    ...timestamps,
  },
  (t) => [index('achievements_status_idx').on(t.statusId, t.sortOrder)],
);

export const achievementPoints = pgTable(
  'achievement_points',
  {
    id: id(),
    achievementId: parentRef('achievement_id', () => achievements.id),
    ...bulletColumns,
    ...timestamps,
  },
  (t) => [index('achievement_points_ach_idx').on(t.achievementId, t.sortOrder)],
);
export const achievementLinks = linkTable('achievement_links', 'achievement_id', () => achievements.id);
export const achievementMedia = mediaTable('achievement_media', 'achievement_id', () => achievements.id);
export const achievementTechnologies = techTable(
  'achievement_technologies',
  'achievement_id',
  () => achievements.id,
);

export const publications = pgTable(
  'publications',
  {
    id: id(),
    typeId: lookupRef('type_id').notNull(), // publication_type
    title: varchar('title', { length: 200 }).notNull(),
    venue: varchar('venue', { length: 160 }),
    date: date('date'),
    summaryEn: text('summary_en'),
    summaryId: text('summary_id'),
    url: text('url'),
    videoMediaId: mediaRef('video_media_id'),
    ...contentColumns,
    ...timestamps,
  },
  (t) => [index('publications_status_idx').on(t.statusId, t.sortOrder)],
);

export const testimonials = pgTable(
  'testimonials',
  {
    id: id(),
    name: varchar('name', { length: 100 }).notNull(),
    position: varchar('position', { length: 100 }),
    organizationId: orgRef('organization_id'),
    avatarMediaId: mediaRef('avatar_media_id'),
    relationship: varchar('relationship', { length: 100 }),
    quoteEn: text('quote_en').notNull(),
    quoteId: text('quote_id'),
    linkedinUrl: text('linkedin_url'),
    ...contentColumns,
    ...timestamps,
  },
  (t) => [index('testimonials_status_idx').on(t.statusId, t.sortOrder)],
);

/* ---------- D. Documents & sharing ---------- */
export const documents = pgTable(
  'documents',
  {
    id: id(),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'restrict' }),
    typeId: lookupRef('type_id').notNull(), // document_type
    localeId: lookupRef('locale_id').notNull(), // locale
    title: varchar('title', { length: 120 }).notNull(),
    version: integer('version').notNull().default(1),
    pageCount: smallint('page_count'),
    isActive: boolean('is_active').notNull().default(false),
    notes: varchar('notes', { length: 300 }),
    ...timestamps,
  },
  (t) => [
    index('documents_type_locale_idx').on(t.typeId, t.localeId),
    uniqueIndex('documents_one_active_uq')
      .on(t.typeId, t.localeId)
      .where(sql`${t.isActive} = true`),
  ],
);

export const exportPresets = pgTable(
  'export_presets',
  {
    id: id(),
    slug: varchar('slug', { length: 60 }).notNull(),
    name: varchar('name', { length: 80 }).notNull(),
    templateId: lookupRef('template_id').notNull(), // export_template
    localeId: lookupRef('locale_id').notNull(), // locale
    featuredOnly: boolean('featured_only').notNull().default(false),
    sinceYears: smallint('since_years'),
    isPublic: boolean('is_public').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex('export_presets_slug_uq').on(t.slug)],
);

const presetRef = () =>
  uuid('preset_id')
    .notNull()
    .references(() => exportPresets.id, { onDelete: 'cascade' });

export const exportPresetSections = pgTable(
  'export_preset_sections',
  {
    id: id(),
    presetId: presetRef(),
    sectionId: lookupRef('section_id').notNull(), // site_section
    itemLimit: smallint('item_limit'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [uniqueIndex('eps_preset_section_uq').on(t.presetId, t.sectionId)],
);

/** Only items using these technologies are exported (empty = no filter). */
export const exportPresetTechnologies = pgTable(
  'export_preset_technologies',
  {
    presetId: presetRef(),
    technologyId: uuid('technology_id')
      .notNull()
      .references(() => technologies.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.presetId, t.technologyId] })],
);

export const shareLinks = pgTable(
  'share_links',
  {
    id: id(),
    token: varchar('token', { length: 43 }).notNull(),
    label: varchar('label', { length: 120 }).notNull(),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
    presetId: uuid('preset_id').references(() => exportPresets.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    viewCount: integer('view_count').notNull().default(0),
    lastOpenedAt: timestamp('last_opened_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [uniqueIndex('share_links_token_uq').on(t.token)],
);

/* ---------- E. Interaction & analytics ---------- */
export const messages = pgTable(
  'messages',
  {
    id: id(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 254 }).notNull(),
    subject: varchar('subject', { length: 150 }),
    body: text('body').notNull(),
    localeId: lookupRef('locale_id').notNull(), // locale
    isRead: boolean('is_read').notNull().default(false),
    isArchived: boolean('is_archived').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('messages_time_idx').on(t.createdAt)],
);

export const events = pgTable(
  'events',
  {
    id: id(),
    typeId: lookupRef('type_id').notNull(), // event_type
    path: varchar('path', { length: 300 }).notNull(),
    localeId: lookupRef('locale_id'), // locale
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    target: varchar('target', { length: 60 }),
    shareLinkId: uuid('share_link_id').references(() => shareLinks.id, { onDelete: 'set null' }),
    visitorHash: varchar('visitor_hash', { length: 64 }).notNull(),
    country: varchar('country', { length: 2 }),
    referrer: varchar('referrer', { length: 300 }),
    utmSource: varchar('utm_source', { length: 60 }),
    utmCampaign: varchar('utm_campaign', { length: 60 }),
    device: varchar('device', { length: 10 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('events_time_idx').on(t.createdAt),
    index('events_type_time_idx').on(t.typeId, t.createdAt),
    index('events_project_idx').on(t.projectId),
  ],
);

export const dailyStats = pgTable(
  'daily_stats',
  {
    date: date('date').notNull(),
    typeId: uuid('type_id')
      .notNull()
      .references(() => lookups.id, { onDelete: 'restrict' }), // event_type
    path: varchar('path', { length: 300 }).notNull().default(''),
    target: varchar('target', { length: 60 }).notNull().default(''),
    count: integer('count').notNull().default(0),
    uniqueVisitors: integer('unique_visitors').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.date, t.typeId, t.path, t.target] })],
);

/** Raw GitHub API snapshot (external cache, not portfolio data). */
export const githubCache = pgTable('github_cache', {
  key: varchar('key', { length: 40 }).primaryKey(),
  data: jsonb('data').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
});
