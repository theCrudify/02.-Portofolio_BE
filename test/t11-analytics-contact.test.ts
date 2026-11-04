import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { app } from '@/index';
import { setTestDb, type DbClient } from '@/db/client';
import { clearMemoryRateLimits } from '@/middleware/rate-limit';
import { aggregateEventsForDate } from '@/services/analytics.service';

interface AnalyticsStore {
  events: Record<string, unknown>[];
  daily_stats: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  users: Record<string, unknown>[];
  [key: string]: Record<string, unknown>[];
}

function createAnalyticsMockDb(store: AnalyticsStore): DbClient {
  const buildChain = (rows: Record<string, unknown>[]) => {
    const chain: Record<string, unknown> = {
      where: () => buildChain(rows),
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
    select: () => ({
      from: (table: unknown) => {
        const name = getTableName(table as Parameters<typeof getTableName>[0]);
        return buildChain(store[name] ?? []);
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
    delete: (table: unknown) => ({
      where: () => {
        const name = getTableName(table as Parameters<typeof getTableName>[0]);
        store[name] = [];
        return Promise.resolve();
      },
    }),
  } as unknown as DbClient;
}

describe('T11 · Analytics Events, Bot Filter, Daily Cron Aggregation & Contact Form', () => {
  let store: AnalyticsStore;

  beforeEach(() => {
    clearMemoryRateLimits();
    store = {
      events: [],
      daily_stats: [],
      messages: [],
      users: [],
    };
    setTestDb(createAnalyticsMockDb(store));
  });

  afterEach(() => {
    setTestDb(null);
  });

  const env = {
    DATABASE_URL: 'postgres://localhost/test',
    JWT_SECRET: 'dev-jwt-secret-min-32-chars-long',
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

  it('ignores bot User-Agents and admin session cookies on POST /v1/events while recording real visitors', async () => {
    // Bot UA -> 204, not stored
    const botRes = await app.request(
      '/v1/events',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        },
        body: JSON.stringify({ type: 'page_view', path: '/en' }),
      },
      env
    );
    expect(botRes.status).toBe(204);
    expect(store.events.length).toBe(0);

    // Admin session cookie -> 204, not stored
    const adminRes = await app.request(
      '/v1/events',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          Cookie: 'pf_session=some-token',
        },
        body: JSON.stringify({ type: 'page_view', path: '/en' }),
      },
      env
    );
    expect(adminRes.status).toBe(204);
    expect(store.events.length).toBe(0);

    // Real visitor -> 204, stored with visitorHash and device
    const visitorRes = await app.request(
      '/v1/events',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148',
          'CF-Connecting-IP': '203.0.113.42',
        },
        body: JSON.stringify({ type: 'page_view', path: '/en/projects' }),
      },
      env
    );
    expect(visitorRes.status).toBe(204);
    expect(store.events.length).toBe(1);
    expect(store.events[0]!.device).toBe('mobile');
    expect(typeof store.events[0]!.visitorHash).toBe('string');
  });

  it('handles contact form honeypot silently, rejects invalid Turnstile token with 403, and saves valid messages', async () => {
    // Stub Cloudflare siteverify: only 'valid-dev-token' passes; other outbound calls (Resend) succeed.
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      if (String(url).includes('turnstile/v0/siteverify')) {
        const token = new URLSearchParams(String(init?.body)).get('response');
        return new Response(JSON.stringify({ success: token === 'valid-dev-token' }));
      }
      return new Response('{}');
    });
    // Honeypot filled -> 200 OK without storing
    const honeyRes = await app.request(
      '/v1/contact',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Spam Bot',
          email: 'bot@spam.com',
          body: 'Buy cheap watches right now!!',
          website: 'https://spambot.com',
          turnstileToken: 'valid-token',
        }),
      },
      env
    );
    expect(honeyRes.status).toBe(200);
    expect(store.messages.length).toBe(0);

    // Missing / invalid Turnstile -> 403 TURNSTILE_FAILED
    const failTurnstile = await app.request(
      '/v1/contact',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Real Person',
          email: 'person@example.com',
          body: 'Hello, I would like to discuss a backend engineering role.',
          turnstileToken: 'invalid-token',
        }),
      },
      env
    );
    expect(failTurnstile.status).toBe(403);
    const failBody = (await failTurnstile.json()) as { error: { code: string } };
    expect(failBody.error.code).toBe('TURNSTILE_FAILED');

    // Valid submission -> 201 Created and stored
    const okRes = await app.request(
      '/v1/contact',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Real Person',
          email: 'person@example.com',
          subject: 'Job Opportunity',
          body: 'Hello, I would like to discuss a backend engineering role.',
          turnstileToken: 'valid-dev-token',
        }),
      },
      env
    );
    expect(okRes.status).toBe(201);
    expect(store.messages.length).toBe(1);

    // siteverify unreachable -> fail closed
    vi.stubGlobal('fetch', async () => {
      throw new Error('network down');
    });
    const downRes = await app.request(
      '/v1/contact',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Real Person',
          email: 'person@example.com',
          body: 'Hello, I would like to discuss a backend engineering role.',
          turnstileToken: 'valid-dev-token',
        }),
      },
      env
    );
    expect(downRes.status).toBe(403);
    vi.unstubAllGlobals();
  });

  it('aggregates daily events idempotently with accurate count and uniqueVisitors', async () => {
    const db = createAnalyticsMockDb(store);
    const dateStr = '2026-04-10';
    const ts = new Date('2026-04-10T12:00:00.000Z');

    store.events.push(
      { type: 'page_view', path: '/en', target: '', visitorHash: 'v1', createdAt: ts },
      { type: 'page_view', path: '/en', target: '', visitorHash: 'v1', createdAt: ts },
      { type: 'page_view', path: '/en', target: '', visitorHash: 'v2', createdAt: ts }
    );

    await aggregateEventsForDate(db, dateStr);
    expect(store.daily_stats.length).toBe(1);
    expect(store.daily_stats[0]!.count).toBe(3);
    expect(store.daily_stats[0]!.uniqueVisitors).toBe(2);

    // Running again on the same date is idempotent (replaces instead of doubling)
    await aggregateEventsForDate(db, dateStr);
    expect(store.daily_stats.length).toBe(1);
    expect(store.daily_stats[0]!.count).toBe(3);
    expect(store.daily_stats[0]!.uniqueVisitors).toBe(2);
  });
});

