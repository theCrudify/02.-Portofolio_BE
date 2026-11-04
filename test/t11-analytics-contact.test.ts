import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { app } from '@/index';
import { setTestDb, type DbClient } from '@/db/client';
import { lk } from '@/db/queries/lookups';
import * as schema from '@/db/schema';
import { clearMemoryRateLimits } from '@/middleware/rate-limit';
import { aggregateEventsForDate } from '@/services/analytics.service';
import { lookupIdOf, useTestDb } from './helpers/db';

describe('T11 · Analytics Events, Bot Filter, Daily Cron Aggregation & Contact Form', () => {
  let db: DbClient;
  const allEvents = () => db.select().from(schema.events);
  const allMessages = () => db.select().from(schema.messages);

  beforeEach(async () => {
    clearMemoryRateLimits();
    db = await useTestDb();
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
    expect(await allEvents()).toHaveLength(0);

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
    expect(await allEvents()).toHaveLength(0);

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
    const stored = await allEvents();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.device).toBe('mobile');
    expect(stored[0]!.visitorHash).toHaveLength(64);
    expect(stored[0]!.typeId).toBe(await lookupIdOf(db, 'event_type', 'page_view'));
    expect(stored[0]!.localeId).toBeNull();
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
    expect(await allMessages()).toHaveLength(0);

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
    const saved = await allMessages();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ email: 'person@example.com', subject: 'Job Opportunity', isRead: false });
    // No locale sent -> defaults to 'en'.
    expect(saved[0]!.localeId).toBe(await lookupIdOf(db, 'locale', 'en'));

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
    const dateStr = '2026-04-10';
    const ts = new Date('2026-04-10T12:00:00.000Z');
    const pageView = lk('event_type', 'page_view');

    await db.insert(schema.events).values([
      { typeId: pageView, path: '/en', target: '', visitorHash: 'v1', createdAt: ts },
      { typeId: pageView, path: '/en', target: '', visitorHash: 'v1', createdAt: ts },
      { typeId: pageView, path: '/en', target: '', visitorHash: 'v2', createdAt: ts },
      // Other day: must not be counted.
      { typeId: pageView, path: '/en', target: '', visitorHash: 'v3', createdAt: new Date('2026-04-11T00:00:00.000Z') },
    ]);

    const expected = [
      {
        date: dateStr,
        typeId: await lookupIdOf(db, 'event_type', 'page_view'),
        path: '/en',
        target: '',
        count: 3,
        uniqueVisitors: 2,
      },
    ];
    const statsFor = () => db.select().from(schema.dailyStats).where(eq(schema.dailyStats.date, dateStr));

    await aggregateEventsForDate(db, dateStr);
    expect(await statsFor()).toEqual(expected);

    // Running again on the same date is idempotent (replaces instead of doubling)
    await aggregateEventsForDate(db, dateStr);
    expect(await statsFor()).toEqual(expected);
  });

  it('rejects unknown event type or locale codes with 400 and stores nothing', async () => {
    const send = (body: Record<string, unknown>) =>
      app.request(
        '/v1/events',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'CF-Connecting-IP': '203.0.113.7',
          },
          body: JSON.stringify(body),
        },
        env
      );

    const badType = await send({ type: 'not_a_type', path: '/en' });
    expect(badType.status).toBe(400);
    expect(((await badType.json()) as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');

    const badLocale = await send({ type: 'page_view', path: '/en', locale: 'xx' });
    expect(badLocale.status).toBe(400);
    expect(await allEvents()).toHaveLength(0);

    const ok = await send({ type: 'page_view', path: '/id', locale: 'id' });
    expect(ok.status).toBe(204);
    const [stored] = await allEvents();
    expect(stored!.localeId).toBe(await lookupIdOf(db, 'locale', 'id'));
  });

  it('rejects a contact message with an unknown locale code with 400', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ success: true })));
    const res = await app.request(
      '/v1/contact',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Real Person',
          email: 'person@example.com',
          body: 'Hello, I would like to discuss a backend engineering role.',
          locale: 'xx',
          turnstileToken: 'valid-dev-token',
        }),
      },
      env
    );
    vi.unstubAllGlobals();
    expect(res.status).toBe(400);
    expect(await allMessages()).toHaveLength(0);
  });
});

