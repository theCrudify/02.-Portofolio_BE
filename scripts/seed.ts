import { eq } from 'drizzle-orm';
import { getDb, type DbClient } from '@/db/client';
import { LOOKUP_SEED } from '@/db/lookup-data';
import { lk } from '@/db/queries/lookups';
import * as schema from '@/db/schema';
import { hashPassword } from '@/lib/password';

export interface SeedOptions {
  ownerEmail?: string;
  ownerPassword?: string;
  ownerName?: string;
}

/** Sample skills; `category` is a tech_category lookup code. */
export const SEED_TECHNOLOGIES: Array<{
  name: string;
  slug: string;
  category: string;
  icon: string;
  sortOrder: number;
}> = [
  { name: 'TypeScript', slug: 'typescript', category: 'frontend', icon: 'typescript', sortOrder: 1 },
  { name: 'React', slug: 'react', category: 'frontend', icon: 'react', sortOrder: 2 },
  { name: 'Next.js', slug: 'nextjs', category: 'frontend', icon: 'nextdotjs', sortOrder: 3 },
  { name: 'Tailwind CSS', slug: 'tailwindcss', category: 'frontend', icon: 'tailwindcss', sortOrder: 4 },
  { name: 'Node.js', slug: 'nodejs', category: 'backend', icon: 'nodedotjs', sortOrder: 5 },
  { name: 'Hono', slug: 'hono', category: 'backend', icon: 'hono', sortOrder: 6 },
  { name: 'Go', slug: 'go', category: 'backend', icon: 'go', sortOrder: 7 },
  { name: 'Python', slug: 'python', category: 'backend', icon: 'python', sortOrder: 8 },
  { name: 'PostgreSQL', slug: 'postgresql', category: 'database', icon: 'postgresql', sortOrder: 9 },
  { name: 'Drizzle', slug: 'drizzle', category: 'database', icon: 'drizzle', sortOrder: 10 },
  { name: 'Docker', slug: 'docker', category: 'devops', icon: 'docker', sortOrder: 11 },
  { name: 'Cloudflare', slug: 'cloudflare', category: 'devops', icon: 'cloudflare', sortOrder: 12 },
  { name: 'Vercel', slug: 'vercel', category: 'devops', icon: 'vercel', sortOrder: 13 },
  { name: 'Git', slug: 'git', category: 'tools', icon: 'git', sortOrder: 14 },
  { name: 'Figma', slug: 'figma', category: 'tools', icon: 'figma', sortOrder: 15 },
];

const published = () => ({ statusId: lk('content_status', 'published'), publishedAt: new Date() });
const draft = () => ({ statusId: lk('content_status', 'draft') });

/** Master data from src/db/lookup-data.ts; existing rows are left untouched. */
export async function seedLookups(db: DbClient): Promise<void> {
  for (const group of LOOKUP_SEED) {
    await db
      .insert(schema.lookupGroups)
      .values({ code: group.code, nameEn: group.en, nameId: group.id, isSystem: group.system ?? false })
      .onConflictDoNothing({ target: schema.lookupGroups.code });
    const [row] = await db
      .select({ id: schema.lookupGroups.id })
      .from(schema.lookupGroups)
      .where(eq(schema.lookupGroups.code, group.code));
    await db
      .insert(schema.lookups)
      .values(
        group.values.map((v, i) => ({
          groupId: row!.id,
          code: v.code,
          labelEn: v.en,
          labelId: v.id ?? v.en,
          icon: v.icon ?? null,
          color: v.color ?? null,
          isSystem: v.system ?? false,
          sortOrder: i,
        })),
      )
      .onConflictDoNothing({ target: [schema.lookups.groupId, schema.lookups.code] });
  }
}

async function upsertOrganization(
  db: DbClient,
  values: { name: string; slug: string; type: string; location?: string; websiteUrl?: string },
): Promise<string> {
  await db
    .insert(schema.organizations)
    .values({
      name: values.name,
      slug: values.slug,
      typeId: lk('organization_type', values.type),
      location: values.location ?? null,
      websiteUrl: values.websiteUrl ?? null,
      ...published(),
    })
    .onConflictDoNothing({ target: schema.organizations.slug });
  const [row] = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, values.slug));
  return row!.id;
}

export async function seedDatabase(db: DbClient, options: SeedOptions = {}): Promise<void> {
  const ownerEmail = (options.ownerEmail ?? process.env.SEED_OWNER_EMAIL ?? 'owner@example.com').toLowerCase();
  const ownerPassword = options.ownerPassword ?? process.env.SEED_OWNER_PASSWORD ?? 'OwnerPassword123!';
  const ownerName = options.ownerName ?? process.env.SEED_OWNER_NAME ?? 'Portfolio Owner';

  if (ownerPassword.length < 12) {
    throw new Error('SEED_OWNER_PASSWORD must be at least 12 characters long');
  }

  // 0. Master data
  await seedLookups(db);

  // 1. Owner user (idempotent by email)
  const existingUsers = await db.select().from(schema.users).where(eq(schema.users.email, ownerEmail));
  if (existingUsers.length === 0) {
    await db.insert(schema.users).values({
      email: ownerEmail,
      name: ownerName,
      passwordHash: await hashPassword(ownerPassword),
      roleId: lk('user_role', 'owner'),
      isActive: true,
    });
  }

  // 2. Singleton profile & settings (id = 1) with their child rows
  const [existingProfile] = await db.select().from(schema.profile).where(eq(schema.profile.id, 1));
  if (!existingProfile) {
    await db.insert(schema.profile).values({
      id: 1,
      name: ownerName,
      headlineEn: 'Fullstack Software Engineer building reliable web & edge systems',
      headlineId: 'Fullstack Software Engineer yang membangun sistem web & edge andal',
      bioEn:
        'Experienced software engineer specializing in TypeScript, Next.js, Hono, and distributed cloud architectures.',
      bioId:
        'Software engineer berpengalaman di bidang TypeScript, Next.js, Hono, dan arsitektur cloud terdistribusi.',
      location: 'Jakarta, Indonesia',
      timezone: 'Asia/Jakarta',
      email: ownerEmail,
      availabilityId: lk('availability', 'open_to_work'),
      workPreferenceId: lk('work_mode', 'remote'),
      careerStartDate: '2022-01-01',
    });
    await db.insert(schema.profileSocials).values([
      { platformId: lk('social_platform', 'github'), url: 'https://github.com/example', sortOrder: 0 },
      { platformId: lk('social_platform', 'linkedin'), url: 'https://linkedin.com/in/example', sortOrder: 1 },
    ]);
    await db.insert(schema.profileLanguages).values([
      { nameEn: 'Indonesian', nameId: 'Bahasa Indonesia', levelId: lk('language_level', 'native'), sortOrder: 0 },
      { nameEn: 'English', nameId: 'Bahasa Inggris', levelId: lk('language_level', 'professional'), sortOrder: 1 },
    ]);
    await db.insert(schema.profileInterests).values([
      { labelEn: 'Edge Computing', labelId: 'Komputasi Edge', icon: 'cpu', sortOrder: 0 },
      { labelEn: 'Open Source', labelId: 'Sumber Terbuka', icon: 'code', sortOrder: 1 },
    ]);
  }

  await db
    .insert(schema.siteSettings)
    .values({
      id: 1,
      themePresetId: lk('theme_preset', 'slate'),
      colorModeId: lk('color_mode', 'system'),
      fontPairId: lk('font_pair', 'geist'),
      heroCvButtonsId: lk('hero_cv_buttons', 'both'),
      seoTitleEn: `${ownerName} · Fullstack Software Engineer`,
      seoTitleId: `${ownerName} · Fullstack Software Engineer`,
      seoDescriptionEn: 'Personal portfolio, case studies, and engineering experience.',
      seoDescriptionId: 'Portofolio pribadi, studi kasus, dan pengalaman rekayasa perangkat lunak.',
    })
    .onConflictDoNothing({ target: schema.siteSettings.id });

  // Home-page sections in lookup order, all visible except the empty ones.
  const sectionLookups = await db
    .select({ id: schema.lookups.id, code: schema.lookups.code, sortOrder: schema.lookups.sortOrder })
    .from(schema.lookups)
    .innerJoin(schema.lookupGroups, eq(schema.lookupGroups.id, schema.lookups.groupId))
    .where(eq(schema.lookupGroups.code, 'site_section'));
  if (sectionLookups.length > 0) {
    await db
      .insert(schema.siteSections)
      .values(
        sectionLookups.map((s) => ({
          sectionId: s.id,
          sortOrder: s.sortOrder,
          isVisible: !['publications', 'testimonials'].includes(s.code),
        })),
      )
      .onConflictDoNothing({ target: schema.siteSections.sectionId });
  }

  // 3. Technologies (published so the skills section has data)
  for (const tech of SEED_TECHNOLOGIES) {
    await db
      .insert(schema.technologies)
      .values({
        name: tech.name,
        slug: tech.slug,
        categoryId: lk('tech_category', tech.category),
        icon: tech.icon,
        showOnSkills: true,
        sortOrder: tech.sortOrder,
        ...published(),
      })
      .onConflictDoNothing({ target: schema.technologies.slug });
  }

  // 4. Organisations, one position with jobdesk, two draft projects linked to it
  const companyId = await upsertOrganization(db, {
    name: 'Tech Nusantara',
    slug: 'tech-nusantara',
    type: 'company',
    location: 'Jakarta, Indonesia',
  });
  const clientId = await upsertOrganization(db, { name: 'Toko Maju', slug: 'toko-maju', type: 'client' });
  const campusId = await upsertOrganization(db, {
    name: 'Universitas Indonesia',
    slug: 'universitas-indonesia',
    type: 'education',
  });
  const issuerId = await upsertOrganization(db, {
    name: 'Amazon Web Services',
    slug: 'amazon-web-services',
    type: 'certification_issuer',
  });
  const communityId = await upsertOrganization(db, {
    name: 'Jakarta JS Community',
    slug: 'jakarta-js-community',
    type: 'community',
  });

  const sampleProjects = [
    {
      slug: 'cashier-app',
      titleEn: 'Cashier App',
      titleId: 'Aplikasi Kasir',
      summaryEn: 'POS for small shops with offline sync and real-time inventory',
      summaryId: 'Aplikasi POS untuk toko ritel dengan sinkronisasi offline dan inventaris real-time',
      type: 'freelance',
      roleEn: 'Fullstack Developer',
      teamSize: 2,
      clientOrganizationId: clientId,
      periodStart: '2025-01-01',
      periodEnd: '2025-04-30',
      problemEn: 'Manual bookkeeping caused frequent stock mismatches across branches.',
      problemId: 'Pembukuan manual menyebabkan selisih stok antar cabang.',
      solutionEn: 'Built an offline-first PWA with background sync and barcode scanning.',
      solutionId: 'Membangun PWA offline-first dengan sinkronisasi latar belakang dan pemindaian barcode.',
      resultEn: 'Reduced checkout time by 60% and eliminated daily stock discrepancies.',
      resultId: 'Memangkas waktu transaksi 60% dan menghilangkan selisih stok harian.',
      metrics: [
        { labelEn: 'Checkout time', labelId: 'Waktu kasir', value: '-60%' },
        { labelEn: 'Daily transactions', labelId: 'Transaksi harian', value: '1,200+' },
      ],
      highlights: [
        { textEn: 'Offline-first IndexedDB sync', textId: 'Sinkronisasi offline-first IndexedDB' },
        { textEn: 'Role-based access control', textId: 'Kontrol akses berbasis peran' },
      ],
      responsibilities: [
        { textEn: 'Gathered requirements with the shop owner', textId: 'Menggali kebutuhan bersama pemilik toko' },
        { textEn: 'Built the PWA frontend and sync API', textId: 'Membangun frontend PWA dan API sinkronisasi' },
      ],
      sortOrder: 1,
    },
    {
      slug: 'edge-analytics-engine',
      titleEn: 'Edge Analytics Engine',
      titleId: 'Mesin Analitik Edge',
      summaryEn: 'Privacy-friendly cookieless web analytics running on Cloudflare Workers',
      summaryId: 'Analitik web tanpa cookie yang ramah privasi di atas Cloudflare Workers',
      type: 'open_source',
      roleEn: 'Creator & Maintainer',
      teamSize: 1,
      clientOrganizationId: null,
      periodStart: '2025-06-01',
      periodEnd: null,
      problemEn: 'Traditional analytics scripts bloat page weight and require cookie banners.',
      problemId: 'Skrip analitik tradisional memperberat halaman dan memerlukan banner cookie.',
      solutionEn: 'Designed a lightweight beacon ingestion pipeline with daily cron aggregation.',
      solutionId: 'Merancang pipeline beacon ringan dengan agregasi cron harian.',
      resultEn: 'Sub-15ms ingestion latency across 300+ edge locations.',
      resultId: 'Latensi pencatatan di bawah 15ms di 300+ lokasi edge.',
      metrics: [{ labelEn: 'Script size', labelId: 'Ukuran skrip', value: '< 1 KB' }],
      highlights: [{ textEn: 'Zero cookies or persistent PII', textId: 'Tanpa cookie atau data pribadi permanen' }],
      responsibilities: [{ textEn: 'Designed the ingestion pipeline', textId: 'Merancang pipeline pencatatan' }],
      sortOrder: 2,
    },
  ];

  const projectIds: string[] = [];
  for (const { type, metrics, highlights, responsibilities, ...proj } of sampleProjects) {
    const [created] = await db
      .insert(schema.projects)
      .values({
        ...proj,
        typeId: lk('project_type', type),
        stateId: lk('project_state', 'live'),
        featured: true,
        ...draft(),
      })
      .onConflictDoNothing({ target: schema.projects.slug })
      .returning({ id: schema.projects.id });
    if (!created) continue; // already seeded
    projectIds.push(created.id);
    const projectId = created.id;
    await db.insert(schema.projectMetrics).values(metrics.map((m, i) => ({ ...m, projectId, sortOrder: i })));
    await db.insert(schema.projectHighlights).values(highlights.map((h, i) => ({ ...h, projectId, sortOrder: i })));
    await db
      .insert(schema.projectResponsibilities)
      .values(responsibilities.map((r, i) => ({ ...r, projectId, sortOrder: i })));
  }

  const existingExp = await db
    .select({ id: schema.experiences.id })
    .from(schema.experiences)
    .where(eq(schema.experiences.organizationId, companyId));
  if (existingExp.length === 0) {
    const [exp] = await db
      .insert(schema.experiences)
      .values({
        organizationId: companyId,
        roleEn: 'Senior Fullstack Engineer',
        roleId: 'Senior Fullstack Engineer',
        employmentTypeId: lk('employment_type', 'full_time'),
        location: 'Jakarta, Indonesia',
        workModeId: lk('work_mode', 'remote'),
        startDate: '2023-03-01',
        descriptionEn: 'Leading core web platform and edge API services.',
        descriptionId: 'Memimpin pengembangan platform web utama dan layanan API edge.',
        sortOrder: 1,
        ...published(),
      })
      .returning({ id: schema.experiences.id });
    await db.insert(schema.experienceResponsibilities).values({
      experienceId: exp!.id,
      textEn: 'Own delivery of the web platform from requirements to production',
      textId: 'Bertanggung jawab atas delivery platform web dari kebutuhan hingga produksi',
      sortOrder: 0,
    });
    await db.insert(schema.experienceAchievements).values({
      experienceId: exp!.id,
      textEn: 'Reduced p95 API latency by 45% through edge caching and query optimization',
      textId: 'Menurunkan latensi API p95 sebesar 45% melalui caching edge dan optimasi query',
      sortOrder: 0,
    });
    if (projectIds.length > 0) {
      await db
        .insert(schema.experienceProjects)
        .values(projectIds.map((projectId, i) => ({ experienceId: exp!.id, projectId, sortOrder: i })));
    }
  }

  const existingEdu = await db.select({ id: schema.education.id }).from(schema.education);
  if (existingEdu.length === 0) {
    const [edu] = await db
      .insert(schema.education)
      .values({
        organizationId: campusId,
        degree: 'B.Sc.',
        fieldEn: 'Computer Science',
        fieldId: 'Ilmu Komputer',
        startDate: '2018-08-01',
        endDate: '2022-07-01',
        gpa: '3.85',
        gpaScale: '4.00',
        descriptionEn: 'Focused on software engineering and distributed systems.',
        descriptionId: 'Fokus pada rekayasa perangkat lunak dan sistem terdistribusi.',
        sortOrder: 1,
        ...published(),
      })
      .returning({ id: schema.education.id });
    await db.insert(schema.educationActivities).values({
      educationId: edu!.id,
      textEn: 'Teaching Assistant for Web Programming & Databases',
      textId: 'Asisten Dosen Pemrograman Web & Basis Data',
      sortOrder: 0,
    });
  }

  const existingCert = await db.select({ id: schema.certifications.id }).from(schema.certifications);
  if (existingCert.length === 0) {
    await db.insert(schema.certifications).values({
      typeId: lk('cert_type', 'certification'),
      name: 'AWS Certified Solutions Architect – Associate',
      issuerOrganizationId: issuerId,
      issueDate: '2024-05-01',
      expiryDate: '2027-05-01',
      credentialId: 'AWS-SAA-12345',
      credentialUrl: 'https://aws.amazon.com/verification',
      featured: true,
      sortOrder: 1,
      ...published(),
    });
  }

  const existingAct = await db.select({ id: schema.activities.id }).from(schema.activities);
  if (existingAct.length === 0) {
    const [act] = await db
      .insert(schema.activities)
      .values({
        typeId: lk('activity_type', 'organization'),
        organizationId: communityId,
        roleEn: 'Speaker & Organizer',
        roleId: 'Pembicara & Pengurus',
        startDate: '2023-01-01',
        descriptionEn: 'Organizing monthly JavaScript & TypeScript meetups.',
        descriptionId: 'Menyelenggarakan pertemuan bulanan komunitas JavaScript & TypeScript.',
        sortOrder: 1,
        ...published(),
      })
      .returning({ id: schema.activities.id });
    await db.insert(schema.activityAchievements).values({
      activityId: act!.id,
      textEn: 'Hosted 12+ community workshops with 500+ attendees',
      textId: 'Menyelenggarakan 12+ lokakarya komunitas dengan 500+ peserta',
      sortOrder: 0,
    });
  }

  // 5. Export presets: full-en (public), one-page-en (public), ats-id (private)
  const presets = [
    {
      slug: 'full-en',
      name: 'Full CV (English)',
      template: 'full',
      locale: 'en',
      featuredOnly: false,
      sections: [
        { key: 'experience' },
        { key: 'projects' },
        { key: 'education' },
        { key: 'certifications' },
        { key: 'skills' },
        { key: 'activities' },
        { key: 'achievements' },
        { key: 'publications' },
      ],
      isPublic: true,
      sortOrder: 1,
    },
    {
      slug: 'one-page-en',
      name: 'One-Page Resume (English)',
      template: 'one_page',
      locale: 'en',
      featuredOnly: true,
      sections: [
        { key: 'experience', limit: 3 },
        { key: 'projects', limit: 3 },
        { key: 'education', limit: 1 },
        { key: 'skills' },
      ],
      isPublic: true,
      sortOrder: 2,
    },
    {
      slug: 'ats-id',
      name: 'CV ATS (Bahasa Indonesia)',
      template: 'ats',
      locale: 'id',
      featuredOnly: false,
      sections: [
        { key: 'experience' },
        { key: 'projects' },
        { key: 'education' },
        { key: 'certifications' },
        { key: 'skills' },
      ],
      isPublic: false,
      sortOrder: 3,
    },
  ];

  for (const { template, locale, sections, ...preset } of presets) {
    const [created] = await db
      .insert(schema.exportPresets)
      .values({ ...preset, templateId: lk('export_template', template), localeId: lk('locale', locale) })
      .onConflictDoNothing({ target: schema.exportPresets.slug })
      .returning({ id: schema.exportPresets.id });
    if (!created) continue;
    await db.insert(schema.exportPresetSections).values(
      sections.map((s, i) => ({
        presetId: created.id,
        sectionId: lk('site_section', s.key),
        itemLimit: 'limit' in s ? (s.limit ?? null) : null,
        sortOrder: i,
      })),
    );
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required to run db:seed');
    process.exit(1);
  }
  const db = getDb({ DATABASE_URL: databaseUrl });
  await seedDatabase(db);
  console.log('Seed completed successfully.');
}

// Run when executed directly via tsx
if (typeof process !== 'undefined' && process.argv?.[1]?.endsWith('seed.ts')) {
  main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
