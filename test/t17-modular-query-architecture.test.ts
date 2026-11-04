import { describe, expect, it } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { app } from '@/index';
import { setTestDb, type DbClient } from '@/db/client';
import { signSession } from '@/lib/jwt';
import { SESSION_COOKIE_NAME } from '@/middleware/auth';
import { SqlQueryBuilder, standardQuerySchema } from '@/core/query';
import * as Modules from '@/modules';

const TEST_ENV = {
  NODE_ENV: 'test',
  FRONTEND_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://mock:mock@localhost:5432/mock',
  JWT_SECRET: 'test-jwt-secret-must-be-at-least-32-chars-long!!',
  IP_HASH_SALT: 'test-ip-salt-at-least-16-chars',
  CLOUDINARY_CLOUD_NAME: 'demo',
  CLOUDINARY_API_KEY: '123456',
  CLOUDINARY_API_SECRET: 'secret',
  TURNSTILE_SECRET: '1x0000000000000000000000000000000AA',
  RESEND_API_KEY: 're_test',
  CONTACT_TO_EMAIL: 'admin@example.com',
};

const OWNER_ID = '01950000-0000-7000-8000-000000000001';

const SAMPLE_PROJECTS = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    slug: 'alpha-cashier',
    titleEn: 'Alpha Cashier POS',
    titleId: 'Kasir Alpha',
    summaryEn: 'Point of sale system built with Go',
    summaryId: 'Sistem kasir berbasis Go',
    type: 'company',
    status: 'published',
    featured: true,
    sortOrder: 2,
    createdAt: new Date('2025-01-10T00:00:00Z'),
    deletedAt: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    slug: 'beta-analytics',
    titleEn: 'Beta Analytics Dashboard',
    titleId: 'Dasbor Analitik Beta',
    summaryEn: 'Realtime telemetry dashboard in Next.js',
    summaryId: 'Dasbor telemetri realtime',
    type: 'personal',
    status: 'draft',
    featured: false,
    sortOrder: 1,
    createdAt: new Date('2025-02-15T00:00:00Z'),
    deletedAt: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    slug: 'gamma-gateway',
    titleEn: 'Gamma API Gateway',
    titleId: 'Gateway API Gamma',
    summaryEn: 'High throughput edge router on Cloudflare Workers',
    summaryId: 'Router edge performa tinggi',
    type: 'open_source',
    status: 'published',
    featured: true,
    sortOrder: 3,
    createdAt: new Date('2025-03-20T00:00:00Z'),
    deletedAt: null,
  },
];

function createMockDb(): DbClient {
  const store: Record<string, Record<string, unknown>[]> = {
    users: [
      {
        id: OWNER_ID,
        email: 'owner@example.com',
        name: 'Owner',
        role: 'owner',
        tokenVersion: 0,
        totpEnabled: false,
        isActive: true,
      },
    ],
    projects: SAMPLE_PROJECTS,
  };

  const buildQueryChain = (rows: Record<string, unknown>[]) => {
    const chain: Record<string, unknown> = {
      where: () => buildQueryChain(rows),
      orderBy: () => buildQueryChain(rows),
      limit: (n: number) => buildQueryChain(rows.slice(0, n)),
      offset: (o: number) => buildQueryChain(rows.slice(o)),
      then: (
        resolve: (val: Record<string, unknown>[]) => unknown,
        reject?: (err: unknown) => unknown,
      ) => Promise.resolve(rows).then(resolve, reject),
    };
    return chain;
  };

  return {
    $count: (table: unknown) =>
      Promise.resolve((store[getTableName(table as Parameters<typeof getTableName>[0])] ?? []).length),
    select: () => ({
      from: (table: unknown) => {
        const name = getTableName(table as Parameters<typeof getTableName>[0]);
        return buildQueryChain(store[name] ?? []);
      },
    }),
  } as unknown as DbClient;
}

async function getOwnerCookie() {
  const token = await signSession(
    {
      sub: OWNER_ID,
      role: 'owner',
      tv: 0,
    },
    TEST_ENV.JWT_SECRET,
  );
  return `${SESSION_COOKIE_NAME}=${token}`;
}

describe('T17 — Feature-Sliced Modular Architecture & Standardized Query Engine', () => {
  it('exports all 8 domain modules and action classes from @/modules', () => {
    expect(Modules.authModuleRoutes).toBeDefined();
    expect(Modules.usersModuleRoutes).toBeDefined();
    expect(Modules.contentModuleRoutes).toBeDefined();
    expect(Modules.mediaModuleRoutes).toBeDefined();
    expect(Modules.documentsModuleRoutes).toBeDefined();
    expect(Modules.analyticsModuleRoutes).toBeDefined();
    expect(Modules.systemModuleRoutes).toBeDefined();
    expect(Modules.publicModuleRoutes).toBeDefined();

    // Verify action-level OOP classes (Repository, Service, Controller)
    expect(Modules.LoginController).toBeDefined();
    expect(Modules.LoginService).toBeDefined();
    expect(Modules.LoginRepository).toBeDefined();
    expect(Modules.ListUsersController).toBeDefined();
    expect(Modules.CreateUserController).toBeDefined();
    expect(Modules.DeleteUserController).toBeDefined();
    expect(Modules.ListContentController).toBeDefined();
    expect(Modules.ListMediaController).toBeDefined();
    expect(Modules.ListDocumentsController).toBeDefined();
    expect(Modules.ListMessagesController).toBeDefined();
    expect(Modules.ListAuditLogsController).toBeDefined();
    expect(Modules.ListPublicProjectsController).toBeDefined();
  });

  it('rejects serialized JSON objects or arrays in query parameters (Zero-JSON in Query policy)', async () => {
    const parsedObj = standardQuerySchema.safeParse({ search: '{"$ne":"admin"}' });
    expect(parsedObj.success).toBe(false);

    const parsedArr = standardQuerySchema.safeParse({ sortBy: '["createdAt","asc"]' });
    expect(parsedArr.success).toBe(false);

    setTestDb(createMockDb());
    const cookie = await getOwnerCookie();

    const res = await app.request(
      '/v1/admin/projects?search=%7B%22status%22%3A%22draft%22%7D',
      {
        method: 'GET',
        headers: { Cookie: cookie },
      },
      TEST_ENV as never,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    setTestDb(null);
  });

  it('supports Fast Filter, Search (q / search), Fast Sort (sortBy / sort), Pagination, and Full Query (all=true)', async () => {
    setTestDb(createMockDb());
    const cookie = await getOwnerCookie();

    // 1. Search by keyword "gateway"
    const searchRes = await app.request(
      '/v1/admin/projects?search=gateway',
      { headers: { Cookie: cookie } },
      TEST_ENV as never,
    );
    expect(searchRes.status).toBe(200);
    const searchBody = (await searchRes.json()) as {
      data: typeof SAMPLE_PROJECTS;
      meta: { total: number; page: number; totalPages: number };
    };
    expect(searchBody.data).toHaveLength(1);
    expect(searchBody.data[0]?.slug).toBe('gamma-gateway');
    expect(searchBody.meta.total).toBe(1);

    // 2. Fast Filter by featured=true + Fast Sort by sortBy=titleEn&sortOrder=desc
    const filterSortRes = await app.request(
      '/v1/admin/projects?featured=true&sortBy=titleEn&sortOrder=desc',
      { headers: { Cookie: cookie } },
      TEST_ENV as never,
    );
    expect(filterSortRes.status).toBe(200);
    const filterSortBody = (await filterSortRes.json()) as {
      data: typeof SAMPLE_PROJECTS;
      meta: { total: number };
    };
    expect(filterSortBody.data).toHaveLength(2);
    expect(filterSortBody.data[0]?.slug).toBe('gamma-gateway');
    expect(filterSortBody.data[1]?.slug).toBe('alpha-cashier');

    // 3. Full Query Mode (all=true) bypasses pagination limit
    const fullQueryRes = await app.request(
      '/v1/admin/projects?limit=1&all=true&sort=sortOrder',
      { headers: { Cookie: cookie } },
      TEST_ENV as never,
    );
    expect(fullQueryRes.status).toBe(200);
    const fullQueryBody = (await fullQueryRes.json()) as {
      data: typeof SAMPLE_PROJECTS;
      meta: { total: number; all: boolean; hasNextPage: boolean };
    };
    expect(fullQueryBody.data).toHaveLength(3);
    expect(fullQueryBody.data[0]?.slug).toBe('beta-analytics');
    expect(fullQueryBody.meta.all).toBe(true);
    expect(fullQueryBody.meta.hasNextPage).toBe(false);

    // 4. Unit test SqlQueryBuilder.computePagination & buildMeta directly
    const pagination = SqlQueryBuilder.computePagination(2, 10);
    expect(pagination).toEqual({ page: 2, limit: 10, offset: 10 });
    const meta = SqlQueryBuilder.buildMeta(2, 10, 25, false);
    expect(meta).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    });

    setTestDb(null);
  });
});
