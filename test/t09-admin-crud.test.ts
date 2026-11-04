import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { app } from '@/index';
import { setTestDb, type DbClient } from '@/db/client';
import { signSession } from '@/lib/jwt';

interface CrudStore {
  users: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  technologies: Record<string, unknown>[];
  certifications: Record<string, unknown>[];
  contact_messages: Record<string, unknown>[];
  audit_logs: Record<string, unknown>[];
  profile: Record<string, unknown>[];
  site_settings: Record<string, unknown>[];
  [key: string]: Record<string, unknown>[];
}

function createCrudMockDb(store: CrudStore): DbClient {
  const buildQueryChain = (rows: Record<string, unknown>[]) => {
    const chain: Record<string, unknown> = {
      where: () => buildQueryChain(rows),
      orderBy: () => buildQueryChain(rows),
      limit: (n: number) => buildQueryChain(rows.slice(0, n)),
      offset: (o: number) => buildQueryChain(rows.slice(o)),
      then: (
        resolve: (val: Record<string, unknown>[]) => unknown,
        reject?: (err: unknown) => unknown
      ) => Promise.resolve(rows).then(resolve, reject),
    };
    return chain;
  };

  return {
    select: () => ({
      from: (table: unknown) => {
        const name = getTableName(table as Parameters<typeof getTableName>[0]);
        const rows = store[name] ?? [];
        return buildQueryChain(rows);
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
            deletedAt: null,
            sortOrder: 0,
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
        where: () => {
          const name = getTableName(table as Parameters<typeof getTableName>[0]);
          const rows = store[name] ?? [];
          const target = rows[rows.length - 1];
          if (target) {
            Object.assign(target, patch);
          }
          return Object.assign(Promise.resolve([target]), {
            returning: () => Promise.resolve([target]),
          });
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: () => {
        const name = getTableName(table as Parameters<typeof getTableName>[0]);
        if (store[name] && store[name]!.length > 0) {
          store[name]!.pop();
        }
        return Promise.resolve();
      },
    }),
  } as unknown as DbClient;
}

describe('T09 · Admin CRUD, Status Transitions, Role Restrictions & Revalidate', () => {
  const jwtSecret = 'dev-jwt-secret-min-32-chars-long';
  const ownerId = '01950000-0000-7000-8000-000000000001';
  const editorId = '01950000-0000-7000-8000-000000000002';
  let store: CrudStore;
  let ownerCookie: string;
  let editorCookie: string;

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
        {
          id: editorId,
          email: 'editor@example.com',
          name: 'Editor',
          role: 'editor',
          tokenVersion: 0,
          totpEnabled: false,
          isActive: true,
        },
      ],
      projects: [],
      technologies: [],
      certifications: [],
      contact_messages: [],
      audit_logs: [],
      profile: [{ id: 1, fullName: 'Jidan' }],
      site_settings: [{ id: 1, colorPreset: 'slate' }],
    };
    setTestDb(createCrudMockDb(store));
    const ownerToken = await signSession(
      { sub: ownerId, role: 'owner', tv: 0 },
      jwtSecret
    );
    const editorToken = await signSession(
      { sub: editorId, role: 'editor', tv: 0 },
      jwtSecret
    );
    ownerCookie = `pf_session=${ownerToken}`;
    editorCookie = `pf_session=${editorToken}`;
  });

  afterEach(() => {
    setTestDb(null);
    vi.restoreAllMocks();
  });

  const env = {
    DATABASE_URL: 'postgres://localhost/test',
    JWT_SECRET: jwtSecret,
    HASH_SALT: 'salt',
    FRONTEND_URL: 'http://localhost:3000',
    REVALIDATE_SECRET: 'rev-secret',
    TURNSTILE_SECRET: 'ts',
    CLOUDINARY_CLOUD_NAME: 'cloud',
    CLOUDINARY_API_KEY: 'key',
    CLOUDINARY_API_SECRET: 'sec',
    RESEND_API_KEY: 're',
    CONTACT_TO_EMAIL: 'me@example.com',
  };

  it('creates project as draft, enforces valid status transitions, and blocks invalid transitions with 400 INVALID_STATE', async () => {
    const createRes = await app.request(
      '/v1/admin/projects',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
          Cookie: ownerCookie,
        },
        body: JSON.stringify({
          slug: 'edge-api-gateway',
          titleId: 'Gateway API Edge',
          titleEn: 'Edge API Gateway',
          summaryId: 'Ringkasan proyek gateway',
          summaryEn: 'Gateway project summary',
        }),
      },
      env
    );
    expect(createRes.status).toBe(201);
    const createdBody = (await createRes.json()) as { data: { id: string; status: string } };
    expect(createdBody.data.status).toBe('draft');
    const projectId = createdBody.data.id;

    // Invalid transition: draft -> unpublish -> 400 INVALID_STATE
    const invalidRes = await app.request(
      `/v1/admin/projects/${projectId}/unpublish`,
      {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          Cookie: ownerCookie,
        },
      },
      env
    );
    expect(invalidRes.status).toBe(400);
    const invalidBody = (await invalidRes.json()) as { error: { code: string } };
    expect(invalidBody.error.code).toBe('INVALID_STATE');

    // Valid transition: draft -> publish
    const publishRes = await app.request(
      `/v1/admin/projects/${projectId}/publish`,
      {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          Cookie: ownerCookie,
        },
      },
      env
    );
    expect(publishRes.status).toBe(200);
    const publishedBody = (await publishRes.json()) as {
      data: { status: string; publishedAt: string };
    };
    expect(publishedBody.data.status).toBe('published');
    expect(publishedBody.data.publishedAt).toBeTruthy();

    // Audit log recorded
    expect(store.audit_logs.length).toBeGreaterThanOrEqual(2);
  });

  it('forbids editor from publishing or editing non-draft items', async () => {
    const projectId = uuidv7();
    store.projects.push({
      id: projectId,
      slug: 'published-proj',
      titleId: 'Judul',
      titleEn: 'Title',
      summaryId: 'Ringkasan',
      summaryEn: 'Summary',
      status: 'published',
      publishedAt: new Date(),
      deletedAt: null,
    });

    // Editor cannot publish/unpublish (owner-only route)
    const unpubRes = await app.request(
      `/v1/admin/projects/${projectId}/unpublish`,
      {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          Cookie: editorCookie,
        },
      },
      env
    );
    expect(unpubRes.status).toBe(403);

    // Editor cannot update a published item
    const updateRes = await app.request(
      `/v1/admin/projects/${projectId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
          Cookie: editorCookie,
        },
        body: JSON.stringify({
          slug: 'published-proj',
          titleId: 'Judul Baru',
          titleEn: 'New Title',
          summaryId: 'Ringkasan',
          summaryEn: 'Summary',
        }),
      },
      env
    );
    expect(updateRes.status).toBe(403);
  });

  it('requires confirmSlugChange when changing slug of a published item and blocks permanent delete on non-archived items', async () => {
    const projectId = uuidv7();
    store.projects.push({
      id: projectId,
      slug: 'original-slug',
      titleId: 'Judul',
      titleEn: 'Title',
      summaryId: 'Ringkasan',
      summaryEn: 'Summary',
      status: 'published',
      publishedAt: new Date(),
      deletedAt: null,
    });

    // Changing slug without confirmSlugChange -> 400
    const slugChangeFail = await app.request(
      `/v1/admin/projects/${projectId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
          Cookie: ownerCookie,
        },
        body: JSON.stringify({
          slug: 'new-slug',
          titleId: 'Judul',
          titleEn: 'Title',
          summaryId: 'Ringkasan',
          summaryEn: 'Summary',
        }),
      },
      env
    );
    expect(slugChangeFail.status).toBe(400);

    // Permanent delete on published item -> 400 INVALID_STATE
    const permFail = await app.request(
      `/v1/admin/projects/${projectId}/permanent`,
      {
        method: 'DELETE',
        headers: {
          Origin: 'http://localhost:3000',
          Cookie: ownerCookie,
        },
      },
      env
    );
    expect(permFail.status).toBe(400);
  });
});

