import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { app } from '@/index';
import { setTestDb, type DbClient } from '@/db/client';
import { lk } from '@/db/queries/lookups';
import * as schema from '@/db/schema';
import { defaultCacheService } from '@/core/cache/memory-cache.service';
import { archived, draft, insertOrganization, published, useTestDb } from './helpers/db';

const NOW = new Date('2026-05-01T10:00:00.000Z');

/** Inserts one realistic, fully linked portfolio (plus draft/deleted rows that must stay hidden). */
async function seedPortfolio(db: DbClient) {
  const [cover, video, logo] = await db
    .insert(schema.media)
    .values([
      {
        providerId: lk('media_provider', 'cloudinary'),
        kindId: lk('media_kind', 'image'),
        url: 'https://res.cloudinary.com/demo/image/upload/v1/portfolio/images/cover.jpg',
        width: 1600,
        height: 900,
        altEn: 'Cashier App Cover',
        altId: 'Sampul Aplikasi Kasir',
        titleEn: 'Cover',
      },
      {
        providerId: lk('media_provider', 'youtube'),
        kindId: lk('media_kind', 'video'),
        embedId: 'abc123',
        url: 'https://www.youtube.com/watch?v=abc123',
        thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
        width: 1280,
        height: 720,
        titleEn: 'Demo',
        altEn: 'Demo Video',
      },
      {
        providerId: lk('media_provider', 'cloudinary'),
        kindId: lk('media_kind', 'image'),
        url: 'https://res.cloudinary.com/demo/image/upload/v1/portfolio/images/acme.png',
        width: 200,
        height: 200,
        altEn: 'Acme logo',
      },
    ])
    .returning({ id: schema.media.id });

  const tokoMaju = await insertOrganization(db, { name: 'Toko Maju', type: 'client' });
  const acme = await insertOrganization(db, {
    name: 'PT Acme',
    type: 'company',
    logoMediaId: logo!.id,
    websiteUrl: 'https://acme.example.com',
  });
  const campus = await insertOrganization(db, { name: 'Universitas Contoh', type: 'education' });
  const aws = await insertOrganization(db, { name: 'AWS', type: 'certification_issuer' });

  await db.insert(schema.profile).values({
    name: 'Jidan Fathilla',
    headlineEn: 'Fullstack Engineer',
    headlineId: 'Insinyur Fullstack',
    bioEn: 'Building scalable systems',
    bioId: '', // empty → falls back to English
    avatarMediaId: cover!.id,
    location: 'Jakarta',
    email: 'jidan@example.com',
    availabilityId: lk('availability', 'open_to_work'),
    workPreferenceId: lk('work_mode', 'remote'),
    referencesNoteEn: 'Available upon request',
    careerStartDate: '2022-01-01',
  });
  await db.insert(schema.profileSocials).values({
    platformId: lk('social_platform', 'github'),
    url: 'https://github.com/jidan',
    handle: 'jidan',
  });
  await db.insert(schema.profileLanguages).values({
    nameEn: 'Indonesian',
    nameId: 'Bahasa Indonesia',
    levelId: lk('language_level', 'native'),
  });
  await db.insert(schema.profileInterests).values({
    labelEn: 'Distributed Systems',
    labelId: 'Sistem Terdistribusi',
    icon: 'cpu',
  });

  await db.insert(schema.siteSettings).values({
    themePresetId: lk('theme_preset', 'forest'),
    colorModeId: lk('color_mode', 'dark'),
    fontPairId: lk('font_pair', 'inter'),
    heroCvButtonsId: lk('hero_cv_buttons', 'export'),
    seoTitleEn: 'Jidan Portfolio',
    seoTitleId: 'Portofolio Jidan',
  });
  // The migration seeds one visible row per site_section; hide one and move projects to the top.
  await db
    .update(schema.siteSections)
    .set({ isVisible: false })
    .where(eq(schema.siteSections.sectionId, lk('site_section', 'testimonials')));
  await db
    .update(schema.siteSections)
    .set({ sortOrder: -1 })
    .where(eq(schema.siteSections.sectionId, lk('site_section', 'projects')));

  const [nextjs, hono] = await db
    .insert(schema.technologies)
    .values([
      { name: 'Next.js', slug: 'nextjs', categoryId: lk('tech_category', 'frontend'), icon: 'nextdotjs', sortOrder: 1, ...published() },
      { name: 'Hono', slug: 'hono', categoryId: lk('tech_category', 'backend'), icon: 'hono', sortOrder: 2, ...published() },
      { name: 'Hidden Draft Tech', slug: 'draft-tech', categoryId: lk('tech_category', 'tools'), sortOrder: 3, ...draft() },
    ])
    .returning({ id: schema.technologies.id });

  const projectBase = {
    stateId: lk('project_state', 'live'),
    featured: true,
    updatedAt: NOW,
  };
  const [cashier, gateway, secret, deleted] = await db
    .insert(schema.projects)
    .values([
      {
        ...projectBase,
        slug: 'cashier-app',
        titleEn: 'Cashier App',
        titleId: 'Aplikasi Kasir',
        summaryEn: 'POS for small shops with offline sync',
        summaryId: '',
        typeId: lk('project_type', 'freelance'),
        roleEn: 'Fullstack Developer',
        roleId: 'Pengembang Fullstack',
        teamSize: 2,
        clientOrganizationId: tokoMaju,
        periodStart: '2026-01-01',
        periodEnd: '2026-04-30',
        problemEn: 'Stock mismatch',
        problemId: 'Stok tidak cocok',
        coverMediaId: cover!.id,
        metaTitleEn: 'Cashier App Case Study',
        sortOrder: 1,
        ...published(),
      },
      {
        ...projectBase,
        slug: 'api-gateway',
        titleEn: 'API Gateway',
        titleId: 'Gerbang API',
        summaryEn: 'Edge API gateway on Workers',
        summaryId: 'Gerbang API Edge di Workers',
        typeId: lk('project_type', 'open_source'),
        periodStart: '2026-02-01',
        sortOrder: 2,
        ...published(),
      },
      {
        ...projectBase,
        slug: 'secret-draft-project',
        titleEn: 'Secret Draft',
        summaryEn: 'Should never be returned in public API',
        typeId: lk('project_type', 'personal'),
        stateId: lk('project_state', 'in_development'),
        sortOrder: 0,
        ...draft(),
      },
      {
        ...projectBase,
        slug: 'deleted-project',
        titleEn: 'Deleted Published',
        summaryEn: 'Soft-deleted published project',
        typeId: lk('project_type', 'personal'),
        sortOrder: 3,
        deletedAt: NOW,
        ...published(),
      },
    ])
    .returning({ id: schema.projects.id });

  await db.insert(schema.projectTechnologies).values([
    { projectId: cashier!.id, technologyId: nextjs!.id, groupId: lk('tech_group', 'frontend'), sortOrder: 1 },
    { projectId: cashier!.id, technologyId: hono!.id, groupId: lk('tech_group', 'backend'), sortOrder: 2 },
    { projectId: gateway!.id, technologyId: hono!.id, groupId: lk('tech_group', 'backend'), sortOrder: 1 },
    { projectId: secret!.id, technologyId: nextjs!.id, groupId: lk('tech_group', 'frontend'), sortOrder: 1 },
    { projectId: deleted!.id, technologyId: nextjs!.id, groupId: lk('tech_group', 'frontend'), sortOrder: 1 },
  ]);
  await db.insert(schema.projectLinks).values([
    { projectId: cashier!.id, typeId: lk('link_type', 'demo'), label: 'Live Demo', url: 'https://demo.example.com', sortOrder: 1 },
    {
      projectId: cashier!.id,
      typeId: lk('link_type', 'repo_backend'),
      label: 'Source Code',
      url: 'https://github.com/private/repo',
      isPrivate: true,
      sortOrder: 2,
    },
  ]);
  await db.insert(schema.projectMedia).values({
    projectId: cashier!.id,
    mediaId: video!.id,
    roleId: lk('project_media_role', 'demo_video'),
    sortOrder: 1,
  });
  await db.insert(schema.projectMetrics).values({
    projectId: cashier!.id,
    labelEn: 'Checkout time',
    labelId: 'Waktu kasir',
    value: '-60%',
  });
  await db.insert(schema.projectHighlights).values([
    { projectId: cashier!.id, textEn: 'JWT + refresh token', sortOrder: 2 },
    { projectId: cashier!.id, textEn: 'Offline-first sync', textId: 'Sinkronisasi offline', sortOrder: 1 },
  ]);
  await db.insert(schema.projectResponsibilities).values([
    { projectId: cashier!.id, textEn: 'Built the sync engine', textId: 'Membangun mesin sinkronisasi', sortOrder: 1 },
    { projectId: cashier!.id, textEn: 'Designed the API', sortOrder: 2 },
  ]);

  const [position, hiddenPosition] = await db
    .insert(schema.experiences)
    .values([
      {
        organizationId: acme,
        roleEn: 'Software Engineer',
        roleId: 'Insinyur Perangkat Lunak',
        employmentTypeId: lk('employment_type', 'full_time'),
        workModeId: lk('work_mode', 'hybrid'),
        startDate: '2024-01-01',
        sortOrder: 1,
        ...published(),
      },
      {
        organizationId: acme,
        roleEn: 'Archived Intern',
        employmentTypeId: lk('employment_type', 'internship'),
        startDate: '2023-01-01',
        sortOrder: 2,
        ...archived(),
      },
    ])
    .returning({ id: schema.experiences.id });
  await db.insert(schema.experienceResponsibilities).values({
    experienceId: position!.id,
    textEn: 'Own the POS platform',
    textId: 'Memegang platform POS',
  });
  await db.insert(schema.experienceAchievements).values({ experienceId: position!.id, textEn: 'Cut checkout time 60%' });
  await db.insert(schema.experienceTechnologies).values({ experienceId: position!.id, technologyId: hono!.id });
  await db.insert(schema.experienceProjects).values([
    { experienceId: position!.id, projectId: cashier!.id, sortOrder: 1 },
    { experienceId: position!.id, projectId: secret!.id, sortOrder: 2 }, // draft: must not leak
    { experienceId: hiddenPosition!.id, projectId: cashier!.id, sortOrder: 1 }, // archived position
  ]);

  await db.insert(schema.education).values({
    organizationId: campus,
    degree: 'S.Kom',
    fieldEn: 'Computer Science',
    fieldId: 'Ilmu Komputer',
    ...published(),
  });

  await db.insert(schema.certifications).values([
    {
      typeId: lk('cert_type', 'certification'),
      name: 'AWS Solutions Architect',
      issuerOrganizationId: aws,
      issueDate: '2023-01-01',
      expiryDate: '2025-01-01', // already expired
      credentialId: 'AWS-123',
      credentialUrl: 'https://aws.amazon.com',
      featured: true,
      sortOrder: 1,
      ...published(),
    },
    {
      typeId: lk('cert_type', 'course'),
      name: 'Hono Deep Dive',
      issuerOrganizationId: aws,
      featured: false,
      sortOrder: 2,
      ...published(),
    },
  ]);

  await db.insert(schema.testimonials).values({
    name: 'Budi',
    position: 'CTO',
    organizationId: acme,
    quoteEn: 'Great engineer',
    quoteId: 'Insinyur hebat',
    ...published(),
  });

  await db.insert(schema.githubCache).values({
    key: 'stats',
    data: { publicRepos: 24, followers: 120, totalStars: 310, topLanguages: [] },
  });
}

interface Lookup {
  code: string;
  label: string;
  icon: string | null;
  color: string | null;
}
interface Org {
  slug: string;
  name: string;
  type: Lookup | null;
  logo: { url: string } | null;
  websiteUrl: string | null;
}
interface SitePayload {
  profile: {
    headline: string;
    bio: string;
    availability: Lookup;
    workPreference: Lookup;
    socials: { platform: Lookup; url: string; handle: string | null }[];
    languages: { name: string; level: Lookup }[];
    interests: { label: string }[];
  };
  settings: {
    themePreset: string;
    colorMode: string;
    fontPair: string;
    heroCvButtons: string;
    sections: { code: string; label: string; visible: boolean }[];
    seo: { title: string | null };
  };
  stats: { projectCount: number; certificationCount: number; yearsExperience: number };
  technologies: { group: Lookup; items: { slug: string }[] }[];
  featuredProjects: { slug: string; title: string; summary: string; type: Lookup; state: Lookup; client: Org | null }[];
  experiences: {
    role: string;
    organization: Org;
    employmentType: Lookup;
    workMode: Lookup | null;
    responsibilities: string[];
    achievements: string[];
    technologies: { slug: string }[];
    projects: { slug: string; title: string }[];
  }[];
  education: { organization: Org; field: string | null }[];
  certifications: { name: string; isExpired: boolean; type: Lookup; issuer: Org }[];
  testimonials: { organization: Org | null; quote: string }[];
  github: { publicRepos: number };
  filters: { projectTypes: Lookup[]; certificationTypes: Lookup[]; activityTypes: Lookup[] };
}

async function getSitePayload(locale: 'en' | 'id'): Promise<SitePayload> {
  const res = await app.request(`/v1/site?locale=${locale}`);
  expect(res.status).toBe(200);
  return (await res.json<{ data: SitePayload }>()).data;
}

describe('T04 · Public API Endpoints', () => {
  beforeEach(async () => {
    // Public services cache in a process-wide store; every test starts from a fresh database.
    await defaultCacheService.clear();
    await seedPortfolio(await useTestDb());
  });

  afterEach(async () => {
    setTestDb(null);
    await defaultCacheService.clear();
  });

  it('GET /v1/site?locale=id returns Indonesian text with English fallback and excludes draft/deleted', async () => {
    const res = await app.request('/v1/site?locale=id');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('s-maxage=300');
    const data = (await res.json<{ data: SitePayload }>()).data;

    expect(data.profile.headline).toBe('Insinyur Fullstack');
    expect(data.profile.bio).toBe('Building scalable systems'); // bioId empty → English
    expect(data.profile.interests[0]?.label).toBe('Sistem Terdistribusi');
    expect(data.profile.availability).toEqual({
      code: 'open_to_work',
      label: 'Siap bekerja',
      icon: null,
      color: 'success',
    });
    expect(data.profile.socials).toEqual([
      { platform: { code: 'github', label: 'GitHub', icon: 'github', color: null }, url: 'https://github.com/jidan', handle: 'jidan' },
    ]);
    expect(data.profile.languages).toEqual([
      { name: 'Bahasa Indonesia', level: expect.objectContaining({ code: 'native', label: 'Bahasa ibu' }) },
    ]);

    // Only the 2 published, non-deleted projects.
    expect(data.stats.projectCount).toBe(2);
    expect(data.featuredProjects.map((p) => p.slug)).toEqual(['cashier-app', 'api-gateway']);
    const cashier = data.featuredProjects[0]!;
    expect(cashier.title).toBe('Aplikasi Kasir');
    expect(cashier.summary).toBe('POS for small shops with offline sync'); // summaryId empty → English
    expect(cashier.type).toMatchObject({ code: 'freelance', label: 'Freelance', icon: 'briefcase' });
    expect(cashier.state).toMatchObject({ code: 'live', label: 'Berjalan', color: 'success' });
    expect(cashier.client).toMatchObject({ slug: 'toko-maju', name: 'Toko Maju', type: { code: 'client', label: 'Klien' } });

    // Skills grouped by tech_category lookup, in lookup order; the draft "tools" tech is gone.
    expect(data.technologies.map((g) => [g.group.code, g.group.label, g.items.map((i) => i.slug)])).toEqual([
      ['frontend', 'Frontend', ['nextjs']],
      ['backend', 'Backend', ['hono']],
    ]);

    // Experience: organization object, lookups, bullets and linked published projects only.
    expect(data.experiences).toHaveLength(1);
    const exp = data.experiences[0]!;
    expect(exp.role).toBe('Insinyur Perangkat Lunak');
    expect(exp.organization).toMatchObject({
      slug: 'pt-acme',
      name: 'PT Acme',
      websiteUrl: 'https://acme.example.com',
      type: { code: 'company', label: 'Perusahaan' },
    });
    expect(exp.organization.logo?.url).toContain('/upload/f_auto,q_auto/');
    expect(exp.employmentType).toMatchObject({ code: 'full_time', label: 'Penuh waktu' });
    expect(exp.workMode).toMatchObject({ code: 'hybrid', label: 'Hibrida' });
    expect(exp.responsibilities).toEqual(['Memegang platform POS']);
    expect(exp.achievements).toEqual(['Cut checkout time 60%']);
    expect(exp.technologies.map((t) => t.slug)).toEqual(['hono']);
    expect(exp.projects).toEqual([{ slug: 'cashier-app', title: 'Aplikasi Kasir' }]);

    expect(data.education[0]).toMatchObject({ field: 'Ilmu Komputer', organization: { name: 'Universitas Contoh' } });

    // Only featured certifications on the site; the count covers all published ones.
    expect(data.stats.certificationCount).toBe(2);
    expect(data.certifications).toHaveLength(1);
    expect(data.certifications[0]).toMatchObject({
      name: 'AWS Solutions Architect',
      isExpired: true,
      type: { code: 'certification', label: 'Sertifikasi' },
      issuer: { slug: 'aws', name: 'AWS', type: { code: 'certification_issuer' } },
    });
    expect(data.testimonials[0]).toMatchObject({ quote: 'Insinyur hebat', organization: { name: 'PT Acme' } });
    expect(data.github.publicRepos).toBe(24);

    // Settings: codes from lookups, sections ordered with a visibility flag.
    expect(data.settings).toMatchObject({
      themePreset: 'forest',
      colorMode: 'dark',
      fontPair: 'inter',
      heroCvButtons: 'export',
      seo: { title: 'Portofolio Jidan' },
    });
    expect(data.settings.sections[0]).toEqual({ code: 'projects', label: 'Proyek', visible: true });
    expect(data.settings.sections.find((s) => s.code === 'testimonials')).toEqual({
      code: 'testimonials',
      label: 'Testimoni',
      visible: false,
    });
    expect(data.settings.sections.filter((s) => !s.visible).map((s) => s.code)).toEqual(['testimonials']);

    // Filter options come from master data.
    expect(data.filters.projectTypes.map((t) => t.code)).toEqual([
      'company',
      'freelance',
      'personal',
      'open_source',
      'hackathon',
    ]);
    expect(data.filters.projectTypes[2]?.label).toBe('Pribadi');
    expect(data.filters.certificationTypes.map((t) => t.code)).toEqual(['certification', 'course', 'bootcamp', 'training']);
    expect(data.filters.activityTypes.map((t) => t.code)).toContain('volunteer');
  });

  it('GET /v1/site?locale=en switches lookup labels and text to English', async () => {
    const data = await getSitePayload('en');
    expect(data.profile.headline).toBe('Fullstack Engineer');
    expect(data.profile.availability.label).toBe('Open to work');
    expect(data.profile.languages[0]).toMatchObject({ name: 'Indonesian', level: { label: 'Native' } });
    expect(data.featuredProjects[0]).toMatchObject({ title: 'Cashier App', state: { label: 'Live' } });
    expect(data.experiences[0]).toMatchObject({
      role: 'Software Engineer',
      employmentType: { label: 'Full time' },
      responsibilities: ['Own the POS platform'],
      projects: [{ slug: 'cashier-app', title: 'Cashier App' }],
    });
    expect(data.settings.sections[0]).toEqual({ code: 'projects', label: 'Projects', visible: true });
    expect(data.filters.projectTypes[2]?.label).toBe('Personal');
    expect(data.technologies[1]?.group.label).toBe('Backend');
  });

  it('GET /v1/projects?technology=nextjs filters projects by technology slug', async () => {
    const res = await app.request('/v1/projects?technology=nextjs');
    expect(res.status).toBe(200);
    const json = await res.json<{
      data: { slug: string; type: Lookup; technologies: { slug: string }[]; primaryLink: { url: string | null } | null }[];
      meta: { page: number; limit: number; total: number };
    }>();

    // Draft and soft-deleted projects also use nextjs but must not count.
    expect(json.meta.total).toBe(1);
    expect(json.data.map((p) => p.slug)).toEqual(['cashier-app']);
    expect(json.data[0]?.technologies.map((t) => t.slug)).toEqual(['nextjs', 'hono']);
    expect(json.data[0]?.primaryLink?.url).toBe('https://demo.example.com');

    const byType = await app.request('/v1/projects?type=open_source');
    const typed = await byType.json<{ data: { slug: string; type: Lookup }[]; meta: { total: number } }>();
    expect(typed.meta.total).toBe(1);
    expect(typed.data[0]).toMatchObject({ slug: 'api-gateway', type: { code: 'open_source' } });

    const unknownTech = await app.request('/v1/projects?technology=draft-tech');
    expect((await unknownTech.json<{ meta: { total: number } }>()).meta.total).toBe(0);
  });

  it('GET /v1/projects/{slug} returns the case-study shape and computes prev/next', async () => {
    const res = await app.request('/v1/projects/cashier-app?locale=en');
    expect(res.status).toBe(200);
    const d = (await res.json<{ data: Record<string, unknown> }>()).data;

    expect(d.slug).toBe('cashier-app');
    expect(d.title).toBe('Cashier App');
    expect(d.summary).toBe('POS for small shops with offline sync');
    expect(d.type).toEqual({ code: 'freelance', label: 'Freelance', icon: 'briefcase', color: null });
    expect(d.state).toMatchObject({ code: 'live', label: 'Live', color: 'success' });
    expect(d.role).toBe('Fullstack Developer');
    expect(d.teamSize).toBe(2);
    expect(d.client).toEqual({
      slug: 'toko-maju',
      name: 'Toko Maju',
      type: expect.objectContaining({ code: 'client', label: 'Client' }),
      logo: null,
      websiteUrl: null,
      location: null,
    });
    expect(d.periodStart).toBe('2026-01-01');
    expect(d.periodEnd).toBe('2026-04-30');
    expect(d.problem).toBe('Stock mismatch');
    expect(d.metrics).toEqual([{ label: 'Checkout time', value: '-60%' }]);
    expect(d.highlights).toEqual(['Offline-first sync', 'JWT + refresh token']); // ordered by sortOrder
    expect(d.responsibilities).toEqual(['Built the sync engine', 'Designed the API']);
    // Grouped by tech_group lookup, in lookup order.
    expect(d.technologies).toEqual([
      {
        group: expect.objectContaining({ code: 'frontend', label: 'Frontend' }),
        items: [{ name: 'Next.js', slug: 'nextjs', icon: 'nextdotjs' }],
      },
      {
        group: expect.objectContaining({ code: 'backend', label: 'Backend' }),
        items: [{ name: 'Hono', slug: 'hono', icon: 'hono' }],
      },
    ]);
    expect(d.links).toEqual([
      {
        type: expect.objectContaining({ code: 'demo', label: 'Live demo' }),
        label: 'Live Demo',
        url: 'https://demo.example.com',
        isPrivate: false,
      },
      { type: expect.objectContaining({ code: 'repo_backend' }), label: 'Source Code', url: null, isPrivate: true },
    ]);
    expect(d.cover).toEqual({
      url: 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/portfolio/images/cover.jpg',
      width: 1600,
      height: 900,
      alt: 'Cashier App Cover',
    });
    expect(d.media).toEqual([
      expect.objectContaining({
        provider: 'youtube',
        kind: 'video',
        embedId: 'abc123',
        role: expect.objectContaining({ code: 'demo_video' }),
      }),
    ]);
    // Only the published position links back to this project.
    expect(d.positions).toEqual([
      {
        id: expect.any(String),
        role: 'Software Engineer',
        organization: expect.objectContaining({ slug: 'pt-acme', name: 'PT Acme' }),
        startDate: '2024-01-01',
        endDate: null,
      },
    ]);
    expect(d.seo).toEqual({ title: 'Cashier App Case Study', description: 'POS for small shops with offline sync' });
    expect(d.prev).toBeNull();
    expect(d.next).toEqual({ slug: 'api-gateway', title: 'API Gateway' });
  });

  it('GET /v1/projects/{slug}?locale=id localizes text, bullets and lookup labels', async () => {
    const res = await app.request('/v1/projects/cashier-app?locale=id');
    expect(res.status).toBe(200);
    const d = (await res.json<{ data: Record<string, unknown> }>()).data;
    expect(d.title).toBe('Aplikasi Kasir');
    expect(d.role).toBe('Pengembang Fullstack');
    expect(d.state).toMatchObject({ code: 'live', label: 'Berjalan' });
    expect(d.metrics).toEqual([{ label: 'Waktu kasir', value: '-60%' }]);
    expect(d.highlights).toEqual(['Sinkronisasi offline', 'JWT + refresh token']);
    expect(d.responsibilities).toEqual(['Membangun mesin sinkronisasi', 'Designed the API']);
    expect(d.positions).toEqual([expect.objectContaining({ role: 'Insinyur Perangkat Lunak' })]);
    expect(d.next).toEqual({ slug: 'api-gateway', title: 'Gerbang API' });

    const last = (await (await app.request('/v1/projects/api-gateway')).json<{ data: Record<string, unknown> }>()).data;
    expect(last.prev).toEqual({ slug: 'cashier-app', title: 'Cashier App' });
    expect(last.next).toBeNull();
    expect(last.client).toBeNull();
    expect(last.positions).toEqual([]);
  });

  it('GET /v1/projects/{slug} returns 404 for draft, soft-deleted, or unknown slug', async () => {
    expect((await app.request('/v1/projects/secret-draft-project')).status).toBe(404);
    expect((await app.request('/v1/projects/deleted-project')).status).toBe(404);
    expect((await app.request('/v1/projects/non-existent')).status).toBe(404);
  });

  it('GET /v1/certifications returns lookup types, issuer organizations and filters by type', async () => {
    const res = await app.request('/v1/certifications?locale=id');
    expect(res.status).toBe(200);
    const json = await res.json<{ data: { name: string; type: Lookup; issuer: Org; isExpired: boolean }[] }>();
    expect(json.data.map((c) => c.name)).toEqual(['AWS Solutions Architect', 'Hono Deep Dive']);
    expect(json.data[1]).toMatchObject({ type: { code: 'course', label: 'Kursus' }, issuer: { name: 'AWS' }, isExpired: false });

    const courses = await app.request('/v1/certifications?type=course');
    const filtered = await courses.json<{ data: { name: string }[] }>();
    expect(filtered.data.map((c) => c.name)).toEqual(['Hono Deep Dive']);
  });

  it('documents public endpoints in /openapi.json', async () => {
    const res = await app.request('/openapi.json');
    expect(res.status).toBe(200);
    const spec = await res.json<{ paths: Record<string, unknown> }>();
    expect(spec.paths['/v1/site']).toBeDefined();
    expect(spec.paths['/v1/projects']).toBeDefined();
    expect(spec.paths['/v1/projects/{slug}']).toBeDefined();
    expect(spec.paths['/v1/certifications']).toBeDefined();
  });
});
