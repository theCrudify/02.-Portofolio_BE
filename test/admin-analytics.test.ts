import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setTestDb, type DbClient } from '@/db/client';
import * as schema from '@/db/schema';
import { getAdminAnalytics } from '@/services/analytics.service';
import { getAdminDashboardSummary } from '@/services/content.service';
import { lookupIdOf, useTestDb } from './helpers/db';

describe('Admin analytics from raw events', () => {
  let db: DbClient;
  beforeEach(async () => {
    db = await useTestDb();
  });
  afterEach(() => setTestDb(null));

  it('includes today, counts daily visitors once, compares with the previous period', async () => {
    const now = new Date('2026-05-10T12:00:00.000Z');
    const pageView = await lookupIdOf(db, 'event_type', 'page_view');
    const click = await lookupIdOf(db, 'event_type', 'link_click');
    const en = await lookupIdOf(db, 'locale', 'en');
    const today = new Date('2026-05-10T08:00:00.000Z');
    await db.insert(schema.events).values([
      // Same visitor on two pages today: 2 views, 1 visitor.
      { typeId: pageView, path: '/en', visitorHash: 'a', localeId: en, country: 'ID', device: 'mobile', referrer: 'https://www.linkedin.com/feed', createdAt: today },
      { typeId: pageView, path: '/en/projects', visitorHash: 'a', localeId: en, country: 'ID', device: 'mobile', createdAt: today },
      { typeId: pageView, path: '/en', visitorHash: 'b', country: 'SG', device: 'desktop', createdAt: new Date('2026-05-05T08:00:00.000Z') },
      { typeId: click, path: '/en', target: 'github', visitorHash: 'a', createdAt: today },
      // Previous 7-day period.
      { typeId: pageView, path: '/en', visitorHash: 'c', createdAt: new Date('2026-04-30T08:00:00.000Z') },
    ]);

    const r = await getAdminAnalytics(db, '7d', now);
    expect(r.series).toHaveLength(7);
    expect(r.series.at(-1)).toEqual({ date: '2026-05-10', views: 2, visitors: 1 });
    expect(r.totals).toMatchObject({ views: 3, visitors: 2, linkClicks: 1 });
    expect(r.previous).toMatchObject({ views: 1, visitors: 1 });
    expect(r.referrers).toContainEqual({ key: 'linkedin.com', count: 1 });
    expect(r.referrers).toContainEqual({ key: 'Direct / none', count: 2 });
    expect(r.countries[0]).toEqual({ key: 'ID', count: 2 });
    expect(r.clicks).toEqual([{ key: 'github', count: 1 }]);
    expect(r.topPaths[0]).toEqual({ path: '/en', count: 2 });
    expect((await getAdminAnalytics(db, '90d', now)).previous).toBeNull();
  });

  it('dashboard lists content counts for every resource', async () => {
    const summary = await getAdminDashboardSummary(db);
    expect(summary.content.map((c) => c.resource)).toContain('projects');
    for (const c of summary.content) expect(c.published + c.draft + c.archived).toBeGreaterThanOrEqual(0);
  });
});
