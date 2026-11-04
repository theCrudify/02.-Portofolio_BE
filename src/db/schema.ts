import {
  pgTable,
  pgEnum,
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
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

/* ---------- Enums ---------- */
export const userRole = pgEnum('user_role', ['owner', 'editor', 'viewer']);
export const contentStatus = pgEnum('content_status', ['draft', 'published', 'archived']);
export const projectType = pgEnum('project_type', [
  'personal',
  'freelance',
  'company',
  'open_source',
  'hackathon',
]);
export const projectState = pgEnum('project_state', ['live', 'in_development', 'archived']);
export const techCategory = pgEnum('tech_category', [
  'frontend',
  'backend',
  'database',
  'devops',
  'tools',
  'soft_skill',
]);
export const techGroup = pgEnum('tech_group', [
  'frontend',
  'backend',
  'database',
  'devops',
  'other',
]);
export const linkType = pgEnum('link_type', [
  'demo',
  'repo_frontend',
  'repo_backend',
  'repo',
  'api_docs',
  'postman',
  'design',
  'video',
  'article',
  'other',
]);
export const employmentType = pgEnum('employment_type', [
  'full_time',
  'part_time',
  'internship',
  'freelance',
  'contract',
]);
export const workMode = pgEnum('work_mode', ['onsite', 'hybrid', 'remote']);
export const availability = pgEnum('availability', ['open_to_work', 'freelance', 'not_available']);
export const certType = pgEnum('cert_type', ['certification', 'course', 'bootcamp', 'training']);
export const activityType = pgEnum('activity_type', ['volunteer', 'committee', 'organization']);
export const publicationType = pgEnum('publication_type', [
  'article',
  'paper',
  'talk',
  'workshop',
  'podcast',
]);
export const mediaProvider = pgEnum('media_provider', ['cloudinary', 'youtube', 'vimeo', 'loom']);
export const mediaKind = pgEnum('media_kind', ['image', 'pdf', 'video']);
export const projectMediaRole = pgEnum('project_media_role', ['gallery', 'demo_video', 'clip']);
export const documentType = pgEnum('document_type', ['cv', 'portfolio_pdf', 'other']);
export const locale = pgEnum('locale', ['en', 'id']);
export const exportTemplate = pgEnum('export_template', ['full', 'one_page', 'ats']);
export const heroCvButtons = pgEnum('hero_cv_buttons', ['uploaded', 'export', 'both']);
export const eventType = pgEnum('event_type', [
  'page_view',
  'link_click',
  'cv_download',
  'export_download',
  'share_open',
  'video_play',
]);
export const auditAction = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
  'delete_permanent',
  'publish',
  'unpublish',
  'archive',
  'restore',
  'reorder',
  'login',
  'logout',
  'settings',
  'import',
]);

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
const contentColumns = {
  status: contentStatus('status').notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};
const mediaRef = (name: string) => uuid(name).references(() => media.id, { onDelete: 'set null' });

/* ---------- A. Akses & keamanan ---------- */
export const users = pgTable(
  'users',
  {
    id: id(),
    email: varchar('email', { length: 254 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    passwordHash: text('password_hash').notNull(), // format: pbkdf2$sha256$<iterasi>$<saltB64>$<hashB64>
    role: userRole('role').notNull().default('viewer'),
    totpSecret: text('totp_secret'), // terenkripsi AES-GCM dengan JWT_SECRET turunan
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
    action: auditAction('action').notNull(),
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

/* ---------- D (dideklarasikan lebih awal karena direferensikan): media ---------- */
export const media = pgTable(
  'media',
  {
    id: id(),
    provider: mediaProvider('provider').notNull(),
    kind: mediaKind('kind').notNull(),
    publicId: varchar('public_id', { length: 255 }), // Cloudinary public_id
    embedId: varchar('embed_id', { length: 64 }), // ID video YouTube/Vimeo/Loom
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
  (t) => [index('media_kind_idx').on(t.kind), index('media_time_idx').on(t.createdAt)],
);

/* ---------- B. Profil & pengaturan ---------- */
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
  socials: jsonb('socials').$type<Record<string, string>>().notNull().default({}),
  availability: availability('availability').notNull().default('open_to_work'),
  workPreference: workMode('work_preference').notNull().default('remote'),
  languages: jsonb('languages')
    .$type<{ name: string; level: string }[]>()
    .notNull()
    .default([]),
  interests: jsonb('interests')
    .$type<{ label_en: string; label_id?: string; icon?: string }[]>()
    .notNull()
    .default([]),
  referencesNoteEn: varchar('references_note_en', { length: 300 }),
  referencesNoteId: varchar('references_note_id', { length: 300 }),
  careerStartDate: date('career_start_date'),
  ...timestamps,
});

export const siteSettings = pgTable('site_settings', {
  id: smallint('id').primaryKey().default(1),
  themePreset: varchar('theme_preset', { length: 20 }).notNull().default('slate'), // slate | forest | sunset | mono
  colorMode: varchar('color_mode', { length: 10 }).notNull().default('system'), // light | dark | system
  fontPair: varchar('font_pair', { length: 20 }).notNull().default('geist'), // geist | inter | serif-accent
  sectionOrder: jsonb('section_order')
    .$type<string[]>()
    .notNull()
    .default([
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
    ]),
  hiddenSections: jsonb('hidden_sections').$type<string[]>().notNull().default([]),
  heroCvButtons: heroCvButtons('hero_cv_buttons').notNull().default('both'),
  seoTitleEn: varchar('seo_title_en', { length: 70 }),
  seoTitleId: varchar('seo_title_id', { length: 70 }),
  seoDescriptionEn: varchar('seo_description_en', { length: 160 }),
  seoDescriptionId: varchar('seo_description_id', { length: 160 }),
  ogMediaId: mediaRef('og_media_id'),
  ...timestamps,
});

/* ---------- C. Konten ---------- */
export const technologies = pgTable(
  'technologies',
  {
    id: id(),
    name: varchar('name', { length: 60 }).notNull(),
    slug: varchar('slug', { length: 60 }).notNull(),
    category: techCategory('category').notNull(),
    icon: varchar('icon', { length: 60 }), // nama ikon simple-icons/lucide
    showOnSkills: boolean('show_on_skills').notNull().default(true),
    ...contentColumns,
    ...timestamps,
  },
  (t) => [
    uniqueIndex('technologies_slug_uq').on(t.slug),
    index('technologies_status_idx').on(t.status, t.sortOrder),
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
    type: projectType('type').notNull(),
    projectState: projectState('project_state').notNull().default('live'),
    role: varchar('role', { length: 80 }),
    teamSize: smallint('team_size'),
    client: varchar('client', { length: 100 }),
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
    metrics: jsonb('metrics')
      .$type<{ label_en: string; label_id?: string; value: string }[]>()
      .notNull()
      .default([]),
    highlights: jsonb('highlights')
      .$type<{ text_en: string; text_id?: string }[]>()
      .notNull()
      .default([]),
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
    index('projects_status_idx').on(t.status, t.sortOrder),
    index('projects_featured_idx').on(t.featured),
  ],
);

export const projectTechnologies = pgTable(
  'project_technologies',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    technologyId: uuid('technology_id')
      .notNull()
      .references(() => technologies.id, { onDelete: 'cascade' }),
    group: techGroup('group').notNull().default('other'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.technologyId] }),
    index('pt_tech_idx').on(t.technologyId),
  ],
);

export const projectLinks = pgTable(
  'project_links',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    type: linkType('type').notNull(),
    label: varchar('label', { length: 60 }).notNull(),
    url: text('url'), // null jika is_private
    isPrivate: boolean('is_private').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('project_links_project_idx').on(t.projectId)],
);

export const projectMedia = pgTable(
  'project_media',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    role: projectMediaRole('role').notNull().default('gallery'),
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
    company: varchar('company', { length: 100 }).notNull(),
    companyMediaId: mediaRef('company_media_id'),
    companyUrl: text('company_url'),
    roleEn: varchar('role_en', { length: 100 }).notNull(),
    roleId: varchar('role_id', { length: 100 }),
    employmentType: employmentType('employment_type').notNull(),
    location: varchar('location', { length: 100 }),
    workMode: workMode('work_mode'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'), // null = masih bekerja
    descriptionEn: text('description_en'),
    descriptionId: text('description_id'),
    achievements: jsonb('achievements')
      .$type<{ text_en: string; text_id?: string }[]>()
      .notNull()
      .default([]),
    ...contentColumns,
    ...timestamps,
  },
  (t) => [index('experiences_status_idx').on(t.status, t.sortOrder)],
);

export const experienceTechnologies = pgTable(
  'experience_technologies',
  {
    experienceId: uuid('experience_id')
      .notNull()
      .references(() => experiences.id, { onDelete: 'cascade' }),
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
    institution: varchar('institution', { length: 120 }).notNull(),
    logoMediaId: mediaRef('logo_media_id'),
    degree: varchar('degree', { length: 100 }),
    fieldEn: varchar('field_en', { length: 120 }),
    fieldId: varchar('field_id', { length: 120 }),
    startDate: date('start_date'),
    endDate: date('end_date'),
    gpa: numeric('gpa', { precision: 4, scale: 2 }),
    gpaScale: numeric('gpa_scale', { precision: 4, scale: 2 }),
    descriptionEn: text('description_en'),
    descriptionId: text('description_id'),
    activities: jsonb('activities')
      .$type<{ text_en: string; text_id?: string }[]>()
      .notNull()
      .default([]),
    ...contentColumns,
    ...timestamps,
  },
  (t) => [index('education_status_idx').on(t.status, t.sortOrder)],
);

export const certifications = pgTable(
  'certifications',
  {
    id: id(),
    type: certType('type').notNull().default('certification'),
    name: varchar('name', { length: 160 }).notNull(),
    issuer: varchar('issuer', { length: 100 }).notNull(),
    issuerMediaId: mediaRef('issuer_media_id'),
    issueDate: date('issue_date'),
    expiryDate: date('expiry_date'),
    credentialId: varchar('credential_id', { length: 120 }),
    credentialUrl: text('credential_url'),
    imageMediaId: mediaRef('image_media_id'),
    featured: boolean('featured').notNull().default(false),
    ...contentColumns,
    ...timestamps,
  },
  (t) => [index('certifications_status_idx').on(t.status, t.sortOrder)],
);

export const activities = pgTable(
  'activities',
  {
    id: id(),
    type: activityType('type').notNull(),
    organization: varchar('organization', { length: 120 }).notNull(),
    eventName: varchar('event_name', { length: 160 }),
    roleEn: varchar('role_en', { length: 100 }).notNull(),
    roleId: varchar('role_id', { length: 100 }),
    startDate: date('start_date'),
    endDate: date('end_date'),
    descriptionEn: text('description_en'),
    descriptionId: text('description_id'),
    achievements: jsonb('achievements')
      .$type<{ text_en: string; text_id?: string }[]>()
      .notNull()
      .default([]),
    mediaId: mediaRef('media_id'),
    linkUrl: text('link_url'),
    ...contentColumns,
    ...timestamps,
  },
  (t) => [index('activities_status_idx').on(t.status, t.sortOrder)],
);

export const achievements = pgTable(
  'achievements',
  {
    id: id(),
    titleEn: varchar('title_en', { length: 160 }).notNull(),
    titleId: varchar('title_id', { length: 160 }),
    issuer: varchar('issuer', { length: 120 }),
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
  (t) => [index('achievements_status_idx').on(t.status, t.sortOrder)],
);

export const publications = pgTable(
  'publications',
  {
    id: id(),
    type: publicationType('type').notNull(),
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
  (t) => [index('publications_status_idx').on(t.status, t.sortOrder)],
);

export const testimonials = pgTable(
  'testimonials',
  {
    id: id(),
    name: varchar('name', { length: 100 }).notNull(),
    position: varchar('position', { length: 100 }),
    company: varchar('company', { length: 100 }),
    avatarMediaId: mediaRef('avatar_media_id'),
    relationship: varchar('relationship', { length: 100 }), // misal "Manager langsung di PT X"
    quoteEn: text('quote_en').notNull(),
    quoteId: text('quote_id'),
    linkedinUrl: text('linkedin_url'),
    ...contentColumns,
    ...timestamps,
  },
  (t) => [index('testimonials_status_idx').on(t.status, t.sortOrder)],
);

/* ---------- D. Dokumen & share ---------- */
export const documents = pgTable(
  'documents',
  {
    id: id(),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'restrict' }),
    type: documentType('type').notNull().default('cv'),
    locale: locale('locale').notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    version: integer('version').notNull().default(1),
    pageCount: smallint('page_count'),
    isActive: boolean('is_active').notNull().default(false),
    notes: varchar('notes', { length: 300 }),
    ...timestamps,
  },
  (t) => [
    index('documents_type_locale_idx').on(t.type, t.locale),
    uniqueIndex('documents_one_active_uq')
      .on(t.type, t.locale)
      .where(sql`${t.isActive} = true`),
  ],
);

export const exportPresets = pgTable(
  'export_presets',
  {
    id: id(),
    slug: varchar('slug', { length: 60 }).notNull(),
    name: varchar('name', { length: 80 }).notNull(),
    template: exportTemplate('template').notNull().default('full'),
    locale: locale('locale').notNull().default('en'),
    sections: jsonb('sections').$type<{ key: string; limit?: number }[]>().notNull(),
    itemFilter: jsonb('item_filter')
      .$type<{ featuredOnly?: boolean; sinceYears?: number; technologyIds?: string[] }>()
      .notNull()
      .default({}),
    isPublic: boolean('is_public').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex('export_presets_slug_uq').on(t.slug)],
);

export const shareLinks = pgTable(
  'share_links',
  {
    id: id(),
    token: varchar('token', { length: 43 }).notNull(), // 32 byte acak, base64url
    label: varchar('label', { length: 120 }).notNull(), // misal "PT ABC – Backend Engineer"
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

/* ---------- E. Interaksi & analytics ---------- */
export const messages = pgTable(
  'messages',
  {
    id: id(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 254 }).notNull(),
    subject: varchar('subject', { length: 150 }),
    body: text('body').notNull(), // maks 5000 karakter (validasi Zod)
    locale: locale('locale').notNull().default('en'),
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
    type: eventType('type').notNull(),
    path: varchar('path', { length: 300 }).notNull(),
    locale: locale('locale'),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    target: varchar('target', { length: 60 }), // jenis link / preset slug / media id
    shareLinkId: uuid('share_link_id').references(() => shareLinks.id, { onDelete: 'set null' }),
    visitorHash: varchar('visitor_hash', { length: 64 }).notNull(),
    country: varchar('country', { length: 2 }),
    referrer: varchar('referrer', { length: 300 }),
    utmSource: varchar('utm_source', { length: 60 }),
    utmCampaign: varchar('utm_campaign', { length: 60 }),
    device: varchar('device', { length: 10 }), // mobile | tablet | desktop
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('events_time_idx').on(t.createdAt),
    index('events_type_time_idx').on(t.type, t.createdAt),
    index('events_project_idx').on(t.projectId),
  ],
);

export const dailyStats = pgTable(
  'daily_stats',
  {
    date: date('date').notNull(),
    type: eventType('type').notNull(),
    path: varchar('path', { length: 300 }).notNull().default(''),
    target: varchar('target', { length: 60 }).notNull().default(''),
    count: integer('count').notNull().default(0),
    uniqueVisitors: integer('unique_visitors').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.date, t.type, t.path, t.target] })],
);

export const githubCache = pgTable('github_cache', {
  key: varchar('key', { length: 40 }).primaryKey(),
  data: jsonb('data').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
});
