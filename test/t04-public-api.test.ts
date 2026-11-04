import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { app } from '@/index';
import { setTestDb, type DbClient } from '@/db/client';

interface TestFixtures {
  profile: Record<string, unknown>[];
  site_settings: Record<string, unknown>[];
  technologies: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  project_technologies: Record<string, unknown>[];
  project_links: Record<string, unknown>[];
  project_media: Record<string, unknown>[];
  experiences: Record<string, unknown>[];
  experience_technologies: Record<string, unknown>[];
  education: Record<string, unknown>[];
  certifications: Record<string, unknown>[];
  activities: Record<string, unknown>[];
  achievements: Record<string, unknown>[];
  publications: Record<string, unknown>[];
  testimonials: Record<string, unknown>[];
  media: Record<string, unknown>[];
  github_cache: Record<string, unknown>[];
}

function createFakeTestDb(fixtures: TestFixtures): DbClient {
  const filterPublished = (tableName: string, rows: Record<string, unknown>[]) => {
    const contentTables = new Set([
      'technologies',
      'projects',
      'experiences',
      'education',
      'certifications',
      'activities',
      'achievements',
      'publications',
      'testimonials',
    ]);
    if (contentTables.has(tableName)) {
      return rows
        .filter((r) => r.status === 'published' && (r.deletedAt === null || r.deletedAt === undefined))
        .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
    }
    if (tableName === 'media') {
      return rows.filter((r) => r.deletedAt === null || r.deletedAt === undefined);
    }
    return rows;
  };

  return {
    select: () => ({
      from: (table: unknown) => {
        const name = getTableName(table as Parameters<typeof getTableName>[0]) as keyof TestFixtures;
        const rawRows = fixtures[name] ?? [];
        const filtered = filterPublished(name, rawRows);
        const chain = {
          where: () => {
            const p = Promise.resolve(filtered);
            return Object.assign(p, {
              orderBy: () => Promise.resolve(filtered),
            });
          },
          orderBy: () => Promise.resolve(filtered),
        };
        return Object.assign(Promise.resolve(filtered), chain);
      },
    }),
  } as unknown as DbClient;
}

describe('T04 · Public API Endpoints', () => {
  const nowIso = '2026-05-01T10:00:00.000Z';

  beforeEach(() => {
    const fixtures: TestFixtures = {
      profile: [
        {
          id: 1,
          name: 'Jidan Fathilla',
          headlineEn: 'Fullstack Engineer',
          headlineId: 'Insinyur Fullstack',
          bioEn: 'Building scalable systems',
          bioId: '', // empty to test fallback to _en
          avatarMediaId: 'media-cover-1',
          location: 'Jakarta',
          timezone: 'Asia/Jakarta',
          email: 'jidan@example.com',
          socials: { github: 'https://github.com/jidan' },
          availability: 'open_to_work',
          workPreference: 'remote',
          languages: [{ name: 'Indonesian', level: 'native' }],
          interests: [{ label_en: 'Distributed Systems', label_id: 'Sistem Terdistribusi', icon: 'cpu' }],
          referencesNoteEn: 'Available upon request',
          referencesNoteId: null,
          careerStartDate: '2022-01-01',
          createdAt: new Date(nowIso),
          updatedAt: new Date(nowIso),
        },
      ],
      site_settings: [
        {
          id: 1,
          themePreset: 'slate',
          colorMode: 'system',
          fontPair: 'geist',
          sectionOrder: ['hero', 'about', 'projects'],
          hiddenSections: [],
          heroCvButtons: 'both',
          seoTitleEn: 'Jidan Portfolio',
          seoTitleId: 'Portofolio Jidan',
          seoDescriptionEn: 'Portfolio description',
          seoDescriptionId: null,
          ogMediaId: null,
          createdAt: new Date(nowIso),
          updatedAt: new Date(nowIso),
        },
      ],
      media: [
        {
          id: 'media-cover-1',
          provider: 'cloudinary',
          kind: 'image',
          url: 'https://res.cloudinary.com/demo/image/upload/v1/portfolio/images/cover.jpg',
          width: 1600,
          height: 900,
          altEn: 'Cashier App Cover',
          altId: 'Sampul Aplikasi Kasir',
          titleEn: 'Cover',
          titleId: null,
          deletedAt: null,
        },
        {
          id: 'media-video-1',
          provider: 'youtube',
          kind: 'video',
          embedId: 'abc123',
          url: 'https://www.youtube.com/watch?v=abc123',
          thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
          width: 1280,
          height: 720,
          titleEn: 'Demo',
          titleId: null,
          altEn: 'Demo Video',
          altId: null,
          deletedAt: null,
        },
      ],
      technologies: [
        {
          id: 'tech-nextjs',
          name: 'Next.js',
          slug: 'nextjs',
          category: 'frontend',
          icon: 'nextdotjs',
          showOnSkills: true,
          status: 'published',
          sortOrder: 1,
          deletedAt: null,
        },
        {
          id: 'tech-hono',
          name: 'Hono',
          slug: 'hono',
          category: 'backend',
          icon: 'hono',
          showOnSkills: true,
          status: 'published',
          sortOrder: 2,
          deletedAt: null,
        },
        {
          id: 'tech-draft',
          name: 'Hidden Draft Tech',
          slug: 'draft-tech',
          category: 'tools',
          icon: 'wrench',
          showOnSkills: true,
          status: 'draft',
          sortOrder: 3,
          deletedAt: null,
        },
      ],
      projects: [
        {
          id: 'proj-1',
          slug: 'cashier-app',
          titleEn: 'Cashier App',
          titleId: 'Aplikasi Kasir',
          summaryEn: 'POS for small shops with offline sync',
          summaryId: '', // fallback to _en
          type: 'freelance',
          projectState: 'live',
          role: 'Fullstack Developer',
          teamSize: 2,
          client: 'Toko Maju',
          periodStart: '2026-01-01',
          periodEnd: '2026-04-30',
          problemEn: 'Stock mismatch',
          problemId: 'Stok tidak cocok',
          solutionEn: 'Offline-first sync',
          solutionId: null,
          resultEn: 'Fast checkout',
          resultId: null,
          challengesEn: 'Conflict resolution',
          challengesId: null,
          metrics: [{ label_en: 'Checkout time', label_id: 'Waktu kasir', value: '-60%' }],
          highlights: [{ text_en: 'Offline-first sync' }, { text_en: 'JWT + refresh token' }],
          coverMediaId: 'media-cover-1',
          architectureMediaId: null,
          featured: true,
          metaTitleEn: 'Cashier App Case Study',
          metaTitleId: null,
          metaDescriptionEn: 'Case study description',
          metaDescriptionId: null,
          status: 'published',
          sortOrder: 1,
          deletedAt: null,
          updatedAt: new Date(nowIso),
        },
        {
          id: 'proj-2',
          slug: 'api-gateway',
          titleEn: 'API Gateway',
          titleId: 'Gerbang API',
          summaryEn: 'Edge API gateway on Workers',
          summaryId: 'Gerbang API Edge di Workers',
          type: 'open_source',
          projectState: 'live',
          role: 'Author',
          teamSize: 1,
          client: null,
          periodStart: '2026-02-01',
          periodEnd: null,
          problemEn: null,
          problemId: null,
          solutionEn: null,
          solutionId: null,
          resultEn: null,
          resultId: null,
          challengesEn: null,
          challengesId: null,
          metrics: [],
          highlights: [],
          coverMediaId: null,
          architectureMediaId: null,
          featured: true,
          metaTitleEn: null,
          metaTitleId: null,
          metaDescriptionEn: null,
          metaDescriptionId: null,
          status: 'published',
          sortOrder: 2,
          deletedAt: null,
          updatedAt: new Date(nowIso),
        },
        {
          id: 'proj-draft',
          slug: 'secret-draft-project',
          titleEn: 'Secret Draft',
          titleId: null,
          summaryEn: 'Should never be returned in public API',
          summaryId: null,
          type: 'personal',
          projectState: 'in_development',
          featured: true,
          status: 'draft',
          sortOrder: 0,
          deletedAt: null,
          updatedAt: new Date(nowIso),
        },
        {
          id: 'proj-deleted',
          slug: 'deleted-project',
          titleEn: 'Deleted Published',
          titleId: null,
          summaryEn: 'Soft-deleted published project',
          summaryId: null,
          type: 'personal',
          projectState: 'live',
          featured: true,
          status: 'published',
          sortOrder: 3,
          deletedAt: new Date(nowIso),
          updatedAt: new Date(nowIso),
        },
      ],
      project_technologies: [
        {
          projectId: 'proj-1',
          technologyId: 'tech-nextjs',
          group: 'frontend',
          sortOrder: 1,
        },
        {
          projectId: 'proj-2',
          technologyId: 'tech-hono',
          group: 'backend',
          sortOrder: 1,
        },
      ],
      project_links: [
        {
          id: 'link-1',
          projectId: 'proj-1',
          type: 'demo',
          label: 'Live Demo',
          url: 'https://demo.example.com',
          isPrivate: false,
          sortOrder: 1,
        },
        {
          id: 'link-2',
          projectId: 'proj-1',
          type: 'repo',
          label: 'Source Code',
          url: 'https://github.com/private/repo',
          isPrivate: true,
          sortOrder: 2,
        },
      ],
      project_media: [
        {
          id: 'pm-1',
          projectId: 'proj-1',
          mediaId: 'media-video-1',
          role: 'demo_video',
          captionEn: null,
          captionId: null,
          sortOrder: 1,
        },
      ],
      experiences: [],
      experience_technologies: [],
      education: [],
      certifications: [
        {
          id: 'cert-1',
          type: 'certification',
          name: 'AWS Solutions Architect',
          issuer: 'AWS',
          issuerMediaId: null,
          issueDate: '2023-01-01',
          expiryDate: '2025-01-01', // expired before 2026
          credentialId: 'AWS-123',
          credentialUrl: 'https://aws.amazon.com',
          imageMediaId: null,
          featured: true,
          status: 'published',
          sortOrder: 1,
          deletedAt: null,
        },
      ],
      activities: [],
      achievements: [],
      publications: [],
      testimonials: [],
      github_cache: [
        {
          key: 'stats',
          data: { publicRepos: 24, followers: 120, totalStars: 310, topLanguages: [] },
        },
      ],
    };

    setTestDb(createFakeTestDb(fixtures));
  });

  afterEach(() => {
    setTestDb(null);
  });

  it('GET /v1/site?locale=id returns Indonesian text with English fallback and excludes draft/deleted', async () => {
    const res = await app.request('/v1/site?locale=id');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('s-maxage=300');

    const json = await res.json<{
      data: {
        profile: { headline: string; bio: string; interests: { label: string }[] };
        stats: { projectCount: number; certificationCount: number; yearsExperience: number };
        technologies: { frontend: { slug: string }[]; tools: { slug: string }[] };
        featuredProjects: { slug: string; title: string; summary: string }[];
        certifications: { name: string; isExpired: boolean }[];
        github: { publicRepos: number };
      };
    }>();

    expect(json.data.profile.headline).toBe('Insinyur Fullstack');
    // bioId is empty -> falls back to bioEn
    expect(json.data.profile.bio).toBe('Building scalable systems');
    expect(json.data.profile.interests[0]?.label).toBe('Sistem Terdistribusi');

    // Only 2 published non-deleted projects (proj-draft and proj-deleted excluded)
    expect(json.data.stats.projectCount).toBe(2);
    expect(json.data.featuredProjects.map((p) => p.slug)).toEqual(['cashier-app', 'api-gateway']);
    expect(json.data.featuredProjects[0]?.title).toBe('Aplikasi Kasir');
    expect(json.data.featuredProjects[0]?.summary).toBe('POS for small shops with offline sync');

    // Draft technology excluded
    expect(json.data.technologies.tools).toEqual([]);
    expect(json.data.certifications[0]?.isExpired).toBe(true);
    expect(json.data.github.publicRepos).toBe(24);
  });

  it('GET /v1/projects?technology=nextjs filters projects by technology slug', async () => {
    const res = await app.request('/v1/projects?technology=nextjs');
    expect(res.status).toBe(200);
    const json = await res.json<{
      data: { slug: string }[];
      meta: { page: number; limit: number; total: number };
    }>();

    expect(json.meta.total).toBe(1);
    expect(json.data).toHaveLength(1);
    expect(json.data[0]?.slug).toBe('cashier-app');
  });

  it('GET /v1/projects/{slug} matches exact 03-API-CONTRACT.md §5 shape and computes prev/next', async () => {
    const res = await app.request('/v1/projects/cashier-app?locale=en');
    expect(res.status).toBe(200);

    const json = await res.json<{ data: Record<string, unknown> }>();
    const d = json.data;

    expect(d.slug).toBe('cashier-app');
    expect(d.title).toBe('Cashier App');
    expect(d.summary).toBe('POS for small shops with offline sync');
    expect(d.type).toBe('freelance');
    expect(d.projectState).toBe('live');
    expect(d.role).toBe('Fullstack Developer');
    expect(d.teamSize).toBe(2);
    expect(d.client).toBe('Toko Maju');
    expect(d.periodStart).toBe('2026-01-01');
    expect(d.periodEnd).toBe('2026-04-30');
    expect(d.metrics).toEqual([{ label: 'Checkout time', value: '-60%' }]);
    expect(d.highlights).toEqual(['Offline-first sync', 'JWT + refresh token']);
    expect(d.technologies).toEqual({
      frontend: [{ name: 'Next.js', slug: 'nextjs', icon: 'nextdotjs' }],
      backend: [],
      database: [],
      devops: [],
      other: [],
    });
    expect(d.links).toEqual([
      { type: 'demo', label: 'Live Demo', url: 'https://demo.example.com', isPrivate: false },
      { type: 'repo', label: 'Source Code', url: null, isPrivate: true },
    ]);
    expect(d.cover).toEqual({
      url: 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/portfolio/images/cover.jpg',
      width: 1600,
      height: 900,
      alt: 'Cashier App Cover',
    });
    expect(d.prev).toBeNull();
    expect(d.next).toEqual({ slug: 'api-gateway', title: 'API Gateway' });
  });

  it('GET /v1/projects/{slug} returns 404 for draft, soft-deleted, or unknown slug', async () => {
    const draftRes = await app.request('/v1/projects/secret-draft-project');
    expect(draftRes.status).toBe(404);

    const deletedRes = await app.request('/v1/projects/deleted-project');
    expect(deletedRes.status).toBe(404);

    const unknownRes = await app.request('/v1/projects/non-existent');
    expect(unknownRes.status).toBe(404);
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
