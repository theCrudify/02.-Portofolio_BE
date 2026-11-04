import { eq } from 'drizzle-orm';
import { getDb, type DbClient } from '@/db/client';
import * as schema from '@/db/schema';
import { hashPassword } from '@/lib/password';

export interface SeedOptions {
  ownerEmail?: string;
  ownerPassword?: string;
  ownerName?: string;
}

export const SEED_TECHNOLOGIES: Array<{
  name: string;
  slug: string;
  category:
    | 'frontend'
    | 'backend'
    | 'database'
    | 'devops'
    | 'tools'
    | 'soft_skill';
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

export async function seedDatabase(db: DbClient, options: SeedOptions = {}): Promise<void> {
  const ownerEmail = (
    options.ownerEmail ??
    process.env.SEED_OWNER_EMAIL ??
    'owner@example.com'
  ).toLowerCase();
  const ownerPassword =
    options.ownerPassword ?? process.env.SEED_OWNER_PASSWORD ?? 'OwnerPassword123!';
  const ownerName = options.ownerName ?? process.env.SEED_OWNER_NAME ?? 'Portfolio Owner';

  if (ownerPassword.length < 12) {
    throw new Error('SEED_OWNER_PASSWORD must be at least 12 characters long');
  }

  // 1. Owner user (idempotent check by email)
  const existingUsers = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, ownerEmail));

  if (existingUsers.length === 0) {
    const passwordHash = await hashPassword(ownerPassword);
    await db.insert(schema.users).values({
      email: ownerEmail,
      name: ownerName,
      passwordHash,
      role: 'owner',
      isActive: true,
    });
  }

  // 2. Singleton profile (id = 1) & site_settings (id = 1)
  await db
    .insert(schema.profile)
    .values({
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
      socials: {
        github: 'https://github.com/example',
        linkedin: 'https://linkedin.com/in/example',
      },
      availability: 'open_to_work',
      workPreference: 'remote',
      languages: [
        { name: 'Indonesian', level: 'native' },
        { name: 'English', level: 'professional' },
      ],
      interests: [
        { label_en: 'Edge Computing', label_id: 'Komputasi Edge', icon: 'cpu' },
        { label_en: 'Open Source', label_id: 'Sumber Terbuka', icon: 'code' },
      ],
      careerStartDate: '2022-01-01',
    })
    .onConflictDoNothing({ target: schema.profile.id });

  await db
    .insert(schema.siteSettings)
    .values({
      id: 1,
      themePreset: 'slate',
      colorMode: 'system',
      fontPair: 'geist',
      heroCvButtons: 'both',
      seoTitleEn: `${ownerName} · Fullstack Software Engineer`,
      seoTitleId: `${ownerName} · Fullstack Software Engineer`,
      seoDescriptionEn: 'Personal portfolio, case studies, and engineering experience.',
      seoDescriptionId: 'Portofolio pribadi, studi kasus, dan pengalaman rekayasa perangkat lunak.',
    })
    .onConflictDoNothing({ target: schema.siteSettings.id });

  // 3. 15 Technologies (published by default so skills section has data)
  for (const tech of SEED_TECHNOLOGIES) {
    await db
      .insert(schema.technologies)
      .values({
        name: tech.name,
        slug: tech.slug,
        category: tech.category,
        icon: tech.icon,
        showOnSkills: true,
        status: 'published',
        publishedAt: new Date(),
        sortOrder: tech.sortOrder,
      })
      .onConflictDoNothing({ target: schema.technologies.slug });
  }

  // 4. Two sample draft projects + 1 experience + 1 education + 1 certification + 1 activity
  const sampleProjects = [
    {
      slug: 'cashier-app',
      titleEn: 'Cashier App',
      titleId: 'Aplikasi Kasir',
      summaryEn: 'POS for small shops with offline sync and real-time inventory',
      summaryId: 'Aplikasi POS untuk toko ritel dengan sinkronisasi offline dan inventaris real-time',
      type: 'freelance' as const,
      projectState: 'live' as const,
      role: 'Fullstack Developer',
      teamSize: 2,
      client: 'Toko Maju',
      periodStart: '2025-01-01',
      periodEnd: '2025-04-30',
      problemEn: 'Manual bookkeeping caused frequent stock mismatches across branches.',
      problemId: 'Pembukuan manual menyebabkan selisih stok antar cabang.',
      solutionEn: 'Built an offline-first PWA with background sync and barcode scanning.',
      solutionId: 'Membangun PWA offline-first dengan sinkronisasi latar belakang dan pemindaian barcode.',
      resultEn: 'Reduced checkout time by 60% and eliminated daily stock discrepancies.',
      resultId: 'Memangkas waktu transaksi 60% dan menghilangkan selisih stok harian.',
      metrics: [
        { label_en: 'Checkout time', label_id: 'Waktu kasir', value: '-60%' },
        { label_en: 'Daily transactions', label_id: 'Transaksi harian', value: '1,200+' },
      ],
      highlights: [
        { text_en: 'Offline-first IndexedDB sync', text_id: 'Sinkronisasi offline-first IndexedDB' },
        { text_en: 'Role-based access control', text_id: 'Kontrol akses berbasis peran' },
      ],
      featured: true,
      status: 'draft' as const,
      sortOrder: 1,
    },
    {
      slug: 'edge-analytics-engine',
      titleEn: 'Edge Analytics Engine',
      titleId: 'Mesin Analitik Edge',
      summaryEn: 'Privacy-friendly cookieless web analytics running on Cloudflare Workers',
      summaryId: 'Analitik web tanpa cookie yang ramah privasi di atas Cloudflare Workers',
      type: 'open_source' as const,
      projectState: 'live' as const,
      role: 'Creator & Maintainer',
      teamSize: 1,
      periodStart: '2025-06-01',
      problemEn: 'Traditional analytics scripts bloat page weight and require cookie banners.',
      problemId: 'Skrip analitik tradisional memperberat halaman dan memerlukan banner cookie.',
      solutionEn: 'Designed a lightweight beacon ingestion pipeline with daily cron aggregation.',
      solutionId: 'Merancang pipeline beacon ringan dengan agregasi cron harian.',
      resultEn: 'Sub-15ms ingestion latency across 300+ edge locations.',
      resultId: 'Latensi pencatatan di bawah 15ms di 300+ lokasi edge.',
      metrics: [{ label_en: 'Script size', label_id: 'Ukuran skrip', value: '< 1 KB' }],
      highlights: [
        { text_en: 'Zero cookies or persistent PII', text_id: 'Tanpa cookie atau data pribadi permanen' },
      ],
      featured: true,
      status: 'draft' as const,
      sortOrder: 2,
    },
  ];

  for (const proj of sampleProjects) {
    await db
      .insert(schema.projects)
      .values(proj)
      .onConflictDoNothing({ target: schema.projects.slug });
  }

  const existingExp = await db.select().from(schema.experiences);
  if (existingExp.length === 0) {
    await db.insert(schema.experiences).values({
      company: 'Tech Nusantara',
      roleEn: 'Senior Fullstack Engineer',
      roleId: 'Senior Fullstack Engineer',
      employmentType: 'full_time',
      location: 'Jakarta, Indonesia',
      workMode: 'remote',
      startDate: '2023-03-01',
      descriptionEn: 'Leading core web platform and edge API services.',
      descriptionId: 'Memimpin pengembangan platform web utama dan layanan API edge.',
      achievements: [
        {
          text_en: 'Reduced p95 API latency by 45% through edge caching and query optimization',
          text_id: 'Menurunkan latensi API p95 sebesar 45% melalui caching edge dan optimasi query',
        },
      ],
      status: 'published',
      publishedAt: new Date(),
      sortOrder: 1,
    });
  }

  const existingEdu = await db.select().from(schema.education);
  if (existingEdu.length === 0) {
    await db.insert(schema.education).values({
      institution: 'Universitas Indonesia',
      degree: 'B.Sc.',
      fieldEn: 'Computer Science',
      fieldId: 'Ilmu Komputer',
      startDate: '2018-08-01',
      endDate: '2022-07-01',
      gpa: '3.85',
      gpaScale: '4.00',
      descriptionEn: 'Focused on software engineering and distributed systems.',
      descriptionId: 'Fokus pada rekayasa perangkat lunak dan sistem terdistribusi.',
      activities: [
        {
          text_en: 'Teaching Assistant for Web Programming & Databases',
          text_id: 'Asisten Dosen Pemrograman Web & Basis Data',
        },
      ],
      status: 'published',
      publishedAt: new Date(),
      sortOrder: 1,
    });
  }

  const existingCert = await db.select().from(schema.certifications);
  if (existingCert.length === 0) {
    await db.insert(schema.certifications).values({
      type: 'certification',
      name: 'AWS Certified Solutions Architect – Associate',
      issuer: 'Amazon Web Services',
      issueDate: '2024-05-01',
      expiryDate: '2027-05-01',
      credentialId: 'AWS-SAA-12345',
      credentialUrl: 'https://aws.amazon.com/verification',
      featured: true,
      status: 'published',
      publishedAt: new Date(),
      sortOrder: 1,
    });
  }

  const existingAct = await db.select().from(schema.activities);
  if (existingAct.length === 0) {
    await db.insert(schema.activities).values({
      type: 'organization',
      organization: 'Jakarta JS Community',
      roleEn: 'Speaker & Organizer',
      roleId: 'Pembicara & Pengurus',
      startDate: '2023-01-01',
      descriptionEn: 'Organizing monthly JavaScript & TypeScript meetups.',
      descriptionId: 'Menyelenggarakan pertemuan bulanan komunitas JavaScript & TypeScript.',
      achievements: [
        {
          text_en: 'Hosted 12+ community workshops with 500+ attendees',
          text_id: 'Menyelenggarakan 12+ lokakarya komunitas dengan 500+ peserta',
        },
      ],
      status: 'published',
      publishedAt: new Date(),
      sortOrder: 1,
    });
  }

  // 5. Three export_presets: full-en (public), one-page-en (public), ats-id (private)
  const presets = [
    {
      slug: 'full-en',
      name: 'Full CV (English)',
      template: 'full' as const,
      locale: 'en' as const,
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
      itemFilter: {},
      isPublic: true,
      sortOrder: 1,
    },
    {
      slug: 'one-page-en',
      name: 'One-Page Resume (English)',
      template: 'one_page' as const,
      locale: 'en' as const,
      sections: [
        { key: 'experience', limit: 3 },
        { key: 'projects', limit: 3 },
        { key: 'education', limit: 1 },
        { key: 'skills' },
      ],
      itemFilter: { featuredOnly: true },
      isPublic: true,
      sortOrder: 2,
    },
    {
      slug: 'ats-id',
      name: 'CV ATS (Bahasa Indonesia)',
      template: 'ats' as const,
      locale: 'id' as const,
      sections: [
        { key: 'experience' },
        { key: 'projects' },
        { key: 'education' },
        { key: 'certifications' },
        { key: 'skills' },
      ],
      itemFilter: {},
      isPublic: false,
      sortOrder: 3,
    },
  ];

  for (const preset of presets) {
    await db
      .insert(schema.exportPresets)
      .values(preset)
      .onConflictDoNothing({ target: schema.exportPresets.slug });
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

