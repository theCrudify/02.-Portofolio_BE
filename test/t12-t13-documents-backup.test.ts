import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getTableColumns, getTableName, type SQL } from 'drizzle-orm';
import { PgDialect, type PgTable } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { app } from '@/index';
import { setTestDb, type DbClient } from '@/db/client';
import { signSession } from '@/lib/jwt';
import { generateShareToken } from '@/services/document.service';

interface DocStore {
  users: Record<string, unknown>[];
  profile: Record<string, unknown>[];
  site_settings: Record<string, unknown>[];
  media: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  export_presets: Record<string, unknown>[];
  share_links: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  experiences: Record<string, unknown>[];
  education: Record<string, unknown>[];
  certifications: Record<string, unknown>[];
  technologies: Record<string, unknown>[];
  events: Record<string, unknown>[];
  audit_logs: Record<string, unknown>[];
  [key: string]: Record<string, unknown>[];
}

const dialect = new PgDialect();

// Applies simple `col = value [and ...]` conditions so lookups by id/slug/token behave like Postgres.
function applyWhere(table: PgTable, rows: Record<string, unknown>[], cond?: SQL) {
  if (!cond) return rows;
  const { sql, params } = dialect.sqlToQuery(cond);
  const byColumn = Object.fromEntries(
    Object.entries(getTableColumns(table)).map(([key, col]) => [col.name, key]),
  );
  const checks = [...sql.matchAll(/"(\w+)" = \$(\d+)/g)].map(([, column, n]) => ({
    key: byColumn[column!]!,
    value: params[Number(n) - 1],
  }));
  return rows.filter((r) => checks.every(({ key, value }) => r[key] === value));
}

function createDocMockDb(store: DocStore): DbClient {
  const buildChain = (rows: Record<string, unknown>[], table?: PgTable) => {
    const chain: Record<string, unknown> = {
      where: (cond?: SQL) => buildChain(table ? applyWhere(table, rows, cond) : rows),
      orderBy: () => buildChain(rows),
      limit: (n: number) => buildChain(rows.slice(0, n)),
      offset: (o: number) => buildChain(rows.slice(o)),
      then: (
        resolve: (val: Record<string, unknown>[]) => unknown,
        reject?: (err: unknown) => unknown
      ) => Promise.resolve(rows).then(resolve, reject),
    };
    return chain;
  };

  return {
    batch: (queries: unknown[]) => Promise.all(queries),
    select: () => ({
      from: (table: unknown) => {
        const name = getTableName(table as Parameters<typeof getTableName>[0]);
        return buildChain(store[name] ?? [], table as PgTable);
      },
    }),
    insert: (table: unknown) => ({
      values: (val: Record<string, unknown> | Record<string, unknown>[]) => {
        const name = getTableName(table as Parameters<typeof getTableName>[0]);
        store[name] = store[name] ?? [];
        const items = Array.isArray(val) ? val : [val];
        const inserted = items.map((item) => {
          const row = {
            id: (item.id as string | undefined) ?? uuidv7(),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...item,
          };
          store[name]!.push(row);
          return row;
        });
        return Object.assign(Promise.resolve(inserted), {
          returning: () => Promise.resolve(inserted),
        });
      },
    }),
    update: (table: unknown) => ({
      set: (patch: Record<string, unknown>) => ({
        where: (cond?: SQL) => {
          const name = getTableName(table as Parameters<typeof getTableName>[0]);
          const matched = applyWhere(table as PgTable, store[name] ?? [], cond);
          for (const r of matched) Object.assign(r, patch);
          return Object.assign(Promise.resolve(matched), {
            returning: () => Promise.resolve(matched),
          });
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: (cond?: SQL) => {
        const name = getTableName(table as Parameters<typeof getTableName>[0]);
        const rows = store[name] ?? [];
        const matched = applyWhere(table as PgTable, rows, cond);
        store[name] = rows.filter((r) => !matched.includes(r));
        return Object.assign(Promise.resolve(matched), {
          returning: () => Promise.resolve(matched),
        });
      },
    }),
  } as unknown as DbClient;
}

describe('T12 & T13 · Documents, Export Presets, Share Links (410 Expired), JSON Resume & Backup Dry-Run', () => {
  const jwtSecret = 'dev-jwt-secret-min-32-chars-long';
  const ownerId = '01950000-0000-7000-8000-000000000001';
  let store: DocStore;
  let ownerCookie: string;

  beforeEach(async () => {
    store = {
      users: [
        {
          id: ownerId,
          email: 'owner@example.com',
          name: 'Owner',
          role: 'owner',
          tokenVersion: 0,
          totpEnabled: false,
          isActive: true,
        },
      ],
      profile: [
        {
          id: 1,
          name: 'Jidan',
          headlineEn: 'Backend Engineer',
          bioEn: 'Building edge systems',
          email: 'jidan@example.com',
          location: 'Jakarta',
          socials: { github: 'https://github.com/jidan' },
        },
      ],
      site_settings: [{ id: 1, themePreset: 'slate' }],
      media: [],
      documents: [],
      export_presets: [
        {
          id: '01950000-0000-7000-8000-000000000010',
          slug: 'full-cv',
          name: 'Full CV',
          template: 'full',
          locale: 'en',
          sections: [{ key: 'projects', limit: 5 }],
          itemFilter: { featuredOnly: true },
          isPublic: true,
        },
        {
          id: '01950000-0000-7000-8000-000000000011',
          slug: 'private-preset',
          name: 'Private Preset',
          template: 'ats',
          locale: 'en',
          sections: [{ key: 'projects' }],
          itemFilter: {},
          isPublic: false,
        },
      ],
      share_links: [],
      projects: [
        {
          id: uuidv7(),
          slug: 'feat-proj',
          titleEn: 'Featured Project',
          summaryEn: 'Summary',
          featured: true,
          status: 'published',
          deletedAt: null,
        },
        {
          id: uuidv7(),
          slug: 'non-feat-proj',
          titleEn: 'Other Project',
          summaryEn: 'Summary',
          featured: false,
          status: 'published',
          deletedAt: null,
        },
      ],
      experiences: [],
      education: [],
      certifications: [],
      technologies: [],
      events: [],
      audit_logs: [],
    };
    setTestDb(createDocMockDb(store));
    const token = await signSession({ sub: ownerId, role: 'owner', tv: 0 }, jwtSecret);
    ownerCookie = `pf_session=${token}`;
  });

  afterEach(() => {
    setTestDb(null);
  });

  const env = {
    DATABASE_URL: 'postgres://localhost/test',
    JWT_SECRET: jwtSecret,
    HASH_SALT: 'salt',
    FRONTEND_URL: 'http://localhost:3000',
    REVALIDATE_SECRET: 'rev',
    TURNSTILE_SECRET: 'ts',
    CLOUDINARY_CLOUD_NAME: 'cloud',
    CLOUDINARY_API_KEY: 'key',
    CLOUDINARY_API_SECRET: 'sec',
    RESEND_API_KEY: 're',
    CONTACT_TO_EMAIL: 'me@example.com',
  };

  it('activates a single CV document per type+locale and serves JSON Resume & public export presets (while blocking private presets)', async () => {
    const mediaId = uuidv7();
    store.media.push({
      id: mediaId,
      provider: 'cloudinary',
      kind: 'pdf',
      url: 'https://res.cloudinary.com/demo/raw/upload/cv.pdf',
    });

    const doc1Id = uuidv7();
    const doc2Id = uuidv7();
    store.documents.push(
      { id: doc1Id, mediaId, type: 'cv', locale: 'en', title: 'CV v1', isActive: true },
      { id: doc2Id, mediaId, type: 'cv', locale: 'en', title: 'CV v2', isActive: false }
    );

    const actRes = await app.request(
      `/v1/admin/documents/${doc2Id}/activate`,
      {
        method: 'POST',
        headers: { Origin: 'http://localhost:3000', Cookie: ownerCookie },
      },
      env
    );
    expect(actRes.status).toBe(200);
    expect(store.documents[0]!.isActive).toBe(false);
    expect(store.documents[1]!.isActive).toBe(true);

    // Public export preset filters featuredOnly
    const pubPresetRes = await app.request('/v1/export/full-cv', {}, env);
    expect(pubPresetRes.status).toBe(200);
    const pubPresetBody = (await pubPresetRes.json()) as {
      data: { sections: { projects: unknown[] } };
    };
    expect(pubPresetBody.data.sections.projects.length).toBe(1);

    // Private preset -> 404 on public route
    const privPresetRes = await app.request('/v1/export/private-preset', {}, env);
    expect(privPresetRes.status).toBe(404);

    // JSON Resume schema
    const resumeRes = await app.request('/v1/export/resume.json', {}, env);
    expect(resumeRes.status).toBe(200);
    const resumeBody = (await resumeRes.json()) as {
      data: { basics: { name: string }; projects: unknown[] };
    };
    expect(resumeBody.data.basics.name).toBe('Jidan');
    expect(resumeBody.data.projects.length).toBe(2);
  });

  it('generates 43-char base64url share tokens, serves private presets via valid share link, and returns 410 SHARE_LINK_EXPIRED when expired/inactive', async () => {
    const token = generateShareToken();
    expect(token.length).toBe(43);

    const activeToken = generateShareToken();
    const expiredToken = generateShareToken();

    store.share_links.push(
      {
        id: uuidv7(),
        token: activeToken,
        label: 'PT ABC - Backend Engineer',
        presetId: '01950000-0000-7000-8000-000000000011',
        expiresAt: new Date(Date.now() + 86400_000),
        isActive: true,
        viewCount: 0,
      },
      {
        id: uuidv7(),
        token: expiredToken,
        label: 'Expired Link',
        presetId: '01950000-0000-7000-8000-000000000011',
        expiresAt: new Date(Date.now() - 86400_000),
        isActive: true,
        viewCount: 0,
      }
    );

    const okShare = await app.request(`/v1/share/${activeToken}`, {}, env);
    expect(okShare.status).toBe(200);
    expect(store.events.some((e) => e.type === 'share_open')).toBe(true);

    const expShare = await app.request(`/v1/share/${expiredToken}`, {}, env);
    expect(expShare.status).toBe(410);
    const expBody = (await expShare.json()) as { error: { code: string } };
    expect(expBody.error.code).toBe('SHARE_LINK_EXPIRED');
  });

  it('returns 404 when updating a share link or export preset that does not exist', async () => {
    const missing = '01950000-0000-7000-8000-00000000dead';
    const headers = { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', Cookie: ownerCookie };
    const link = await app.request(
      `/v1/admin/share-links/${missing}`,
      { method: 'PATCH', headers, body: JSON.stringify({ label: 'x' }) },
      env
    );
    expect(link.status).toBe(404);
    const preset = await app.request(
      `/v1/admin/export-presets/${missing}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ slug: 'x', name: 'X', sections: [{ key: 'projects' }] }),
      },
      env
    );
    expect(preset.status).toBe(404);
  });

  it('exports JSON backup bundle and supports dryRun=true import without mutating DB', async () => {
    const expRes = await app.request(
      '/v1/admin/backup/export',
      {
        headers: { Cookie: ownerCookie },
      },
      env
    );
    expect(expRes.status).toBe(200);
    const expBody = (await expRes.json()) as { data: Record<string, unknown> };

    const beforeProjectsCount = store.projects.length;
    const dryRes = await app.request(
      '/v1/admin/backup/import?dryRun=true',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
          Cookie: ownerCookie,
        },
        body: JSON.stringify(expBody.data),
      },
      env
    );
    expect(dryRes.status).toBe(200);
    const dryBody = (await dryRes.json()) as { data: { dryRun: boolean; valid: boolean } };
    expect(dryBody.data.dryRun).toBe(true);
    expect(dryBody.data.valid).toBe(true);
    expect(store.projects.length).toBe(beforeProjectsCount);
  });
});

