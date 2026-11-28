import { and, desc, eq, gte, lt, lte } from 'drizzle-orm';
import type { Database } from '../db/client';
import { paginate, type PaginateInput } from '../db/queries/common';
import { loadLookups, type WithSql } from '../db/queries/lookups';
import { dailyStats, events, githubCache, loginAttempts, messages, projects, shareLinks } from '../db/schema';
import { revalidate } from '../lib/revalidate';
import type { Env } from '../types/env';

export async function aggregateEventsForDate(db: Database, dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);

  const allEvents = await db
    .select()
    .from(events)
    .where(and(gte(events.createdAt, start), lte(events.createdAt, end)));
  const dayEvents = allEvents.filter((ev) => {
    const t = ev.createdAt instanceof Date ? ev.createdAt.getTime() : new Date(String(ev.createdAt)).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });

  const groups = new Map<
    string,
    {
      date: string;
      typeId: string;
      path: string;
      target: string;
      count: number;
      visitors: Set<string>;
    }
  >();

  for (const ev of dayEvents) {
    const path = ev.path ?? '';
    const target = ev.target ?? '';
    const key = `${dateStr}|${ev.typeId}|${path}|${target}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        date: dateStr,
        typeId: ev.typeId,
        path,
        target,
        count: 0,
        visitors: new Set(),
      };
      groups.set(key, g);
    }
    g.count += 1;
    if (ev.visitorHash) {
      g.visitors.add(ev.visitorHash);
    }
  }

  // Upsert / replace dailyStats rows for dateStr
  await db.delete(dailyStats).where(eq(dailyStats.date, dateStr));
  const toInsert = Array.from(groups.values()).map((g) => ({
    date: g.date,
    typeId: g.typeId,
    path: g.path,
    target: g.target,
    count: g.count,
    uniqueVisitors: g.visitors.size,
  }));

  if (toInsert.length > 0) {
    await db.insert(dailyStats).values(toInsert);
  }

  return { date: dateStr, aggregatedGroups: toInsert.length, totalEvents: dayEvents.length };
}

interface GithubUser {
  public_repos?: number;
  followers?: number;
}
interface GithubRepo {
  fork?: boolean;
  stargazers_count?: number;
  language?: string | null;
}

// Shape of github_cache.data (key = 'stats') per 02-DATABASE-SCHEMA.md
export function buildGithubStats(user: GithubUser, repos: GithubRepo[]) {
  const own = repos.filter((r) => !r.fork);
  const langCount = new Map<string, number>();
  for (const r of own) {
    if (r.language) langCount.set(r.language, (langCount.get(r.language) ?? 0) + 1);
  }
  const withLang = [...langCount.values()].reduce((a, b) => a + b, 0);
  const topLanguages = [...langCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, n]) => ({ name, percent: Math.round((n / withLang) * 100) }));
  return {
    publicRepos: user.public_repos ?? 0,
    followers: user.followers ?? 0,
    totalStars: own.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0),
    topLanguages,
  };
}

export async function runNightlyCron(db: Database, env: Env, referenceNow = new Date()) {
  const yesterday = new Date(referenceNow.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const agg = await aggregateEventsForDate(db, yesterday);

  // Prune raw events older than 90 days
  const cutoff90d = new Date(referenceNow.getTime() - 90 * 24 * 60 * 60 * 1000);
  await db.delete(events).where(lt(events.createdAt, cutoff90d));

  const cutoff7d = new Date(referenceNow.getTime() - 7 * 24 * 60 * 60 * 1000);
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, cutoff7d));

  await db
    .update(shareLinks)
    .set({ isActive: false })
    .where(and(eq(shareLinks.isActive, true), lt(shareLinks.expiresAt, referenceNow)));

  // Refresh GitHub cache if configured
  if (env.GITHUB_USERNAME) {
    try {
      const headers: Record<string, string> = {
        'User-Agent': 'portfolio-api-worker',
        Accept: 'application/vnd.github+json',
      };
      if (env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
      }
      const user = encodeURIComponent(env.GITHUB_USERNAME);
      const [userRes, reposRes] = await Promise.all([
        fetch(`https://api.github.com/users/${user}`, { headers }),
        fetch(`https://api.github.com/users/${user}/repos?per_page=100&type=owner`, { headers }),
      ]);
      if (userRes.ok && reposRes.ok) {
        const stats = buildGithubStats(
          (await userRes.json()) as GithubUser,
          (await reposRes.json()) as GithubRepo[]
        );
        const [existing] = await db.select().from(githubCache).where(eq(githubCache.key, 'stats'));
        await db.delete(githubCache).where(eq(githubCache.key, 'stats'));
        await db.insert(githubCache).values({ key: 'stats', data: stats, fetchedAt: new Date() });
        if (JSON.stringify(existing?.data) !== JSON.stringify(stats)) {
          await revalidate(env, ['site']);
        }
      }
    } catch {
      // Ignore network errors during GitHub cache refresh
    }
  }

  return agg;
}

type Breakdown = { key: string; count: number }[];

/** Count map -> top-N list, largest first. */
function top(map: Map<string, number>, n = 10): Breakdown {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function referrerHost(ref: string | null) {
  if (!ref) return 'Direct / none';
  try {
    return new URL(ref).hostname.replace(/^www\./, '') || 'Direct / none';
  } catch {
    return ref.slice(0, 60);
  }
}

interface PeriodTotals {
  views: number;
  visitors: number;
  cvDownloads: number;
  linkClicks: number;
  shareOpens: number;
  videoPlays: number;
  messages: number;
}

/**
 * Reads raw events (kept 90 days by the nightly cron) instead of daily_stats, so today's traffic
 * shows up immediately and visitors are counted once per day across all pages.
 * Visitor hashes rotate daily, so "visitors" = sum of daily unique visitors.
 * shortcut: loads the range's events into memory; move to SQL GROUP BY if traffic grows past ~100k events/90d.
 */
export async function getAdminAnalytics(
  db: Database,
  range: '7d' | '30d' | '90d' = '30d',
  now = new Date(),
) {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const DAY = 24 * 60 * 60 * 1000;
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const since = new Date(todayStart - (days - 1) * DAY);
  // Raw events only go back 90 days, so a 90d range has no previous period to compare with.
  const prevSince = days < 90 ? new Date(since.getTime() - days * DAY) : since;

  const [rows, msgRows, projectRows, lookups] = await Promise.all([
    db
      .select({
        typeId: events.typeId,
        path: events.path,
        localeId: events.localeId,
        projectId: events.projectId,
        target: events.target,
        visitorHash: events.visitorHash,
        country: events.country,
        referrer: events.referrer,
        utmSource: events.utmSource,
        device: events.device,
        createdAt: events.createdAt,
      })
      .from(events)
      .where(gte(events.createdAt, prevSince)),
    db.select({ createdAt: messages.createdAt }).from(messages).where(gte(messages.createdAt, prevSince)),
    db.select({ id: projects.id, title: projects.titleEn, slug: projects.slug }).from(projects),
    loadLookups(db),
  ]);

  const emptyTotals = (): PeriodTotals => ({
    views: 0, visitors: 0, cvDownloads: 0, linkClicks: 0, shareOpens: 0, videoPlays: 0, messages: 0,
  });
  const current = emptyTotals();
  const previous = emptyTotals();

  const series = new Map<string, { date: string; views: number; visitors: number; hashes: Set<string> }>();
  for (let i = 0; i < days; i++) {
    const date = new Date(since.getTime() + i * DAY).toISOString().slice(0, 10);
    series.set(date, { date, views: 0, visitors: 0, hashes: new Set() });
  }
  const prevHashesByDay = new Map<string, Set<string>>();

  const pages = new Map<string, number>();
  const projectViews = new Map<string, number>();
  const referrers = new Map<string, number>();
  const countries = new Map<string, number>();
  const devices = new Map<string, number>();
  const locales = new Map<string, number>();
  const campaigns = new Map<string, number>();
  const clicks = new Map<string, number>();
  const eventTypes = new Map<string, number>();

  const sinceMs = since.getTime();
  for (const ev of rows) {
    const t = new Date(ev.createdAt).getTime();
    const date = new Date(t).toISOString().slice(0, 10);
    const type = lookups.code(ev.typeId) ?? 'unknown';
    const isCurrent = t >= sinceMs;
    const totals = isCurrent ? current : previous;

    if (type === 'page_view') {
      totals.views++;
      if (isCurrent) {
        const day = series.get(date);
        if (day) {
          day.views++;
          day.hashes.add(ev.visitorHash);
        }
      } else {
        const set = prevHashesByDay.get(date) ?? new Set<string>();
        set.add(ev.visitorHash);
        prevHashesByDay.set(date, set);
      }
    } else if (type === 'cv_download' || type === 'export_download') totals.cvDownloads++;
    else if (type === 'link_click') totals.linkClicks++;
    else if (type === 'share_open') totals.shareOpens++;
    else if (type === 'video_play') totals.videoPlays++;

    if (!isCurrent) continue;
    bump(eventTypes, type);
    if (type === 'link_click' && ev.target) bump(clicks, ev.target);
    if (type !== 'page_view') continue;
    bump(pages, ev.path);
    if (ev.projectId) bump(projectViews, ev.projectId);
    bump(referrers, referrerHost(ev.referrer));
    bump(countries, ev.country ?? '??');
    bump(devices, ev.device ?? 'unknown');
    bump(locales, (ev.localeId && lookups.code(ev.localeId)) || 'unknown');
    if (ev.utmSource) bump(campaigns, ev.utmSource);
  }

  for (const day of series.values()) {
    day.visitors = day.hashes.size;
    current.visitors += day.visitors;
  }
  for (const set of prevHashesByDay.values()) previous.visitors += set.size;
  for (const m of msgRows) {
    if (new Date(m.createdAt).getTime() >= sinceMs) current.messages++;
    else previous.messages++;
  }

  const projectById = new Map(projectRows.map((p) => [p.id, p]));

  return {
    range,
    since: since.toISOString().slice(0, 10),
    totals: {
      ...current,
      // Kept for older clients.
      uniqueVisitors: current.visitors,
      contactSubmissions: current.messages,
    },
    previous: days < 90 ? previous : null,
    series: [...series.values()].map(({ date, views, visitors }) => ({ date, views, visitors })),
    topPaths: top(pages).map(({ key, count }) => ({ path: key, count })),
    topProjects: top(projectViews).map(({ key, count }) => ({
      key: projectById.get(key)?.title ?? projectById.get(key)?.slug ?? 'Deleted project',
      count,
    })),
    referrers: top(referrers),
    countries: top(countries),
    devices: top(devices),
    locales: top(locales),
    campaigns: top(campaigns),
    clicks: top(clicks),
    eventTypes: top(eventTypes),
  };
}

export async function recordEvent(db: Database, values: WithSql<typeof events.$inferInsert>) {
  await db.insert(events).values(values);
}

export async function saveContactMessage(
  db: Database,
  values: WithSql<typeof messages.$inferInsert>,
) {
  const [saved] = await db.insert(messages).values(values).returning();
  return saved;
}

export async function listAdminMessages(db: Database, query: PaginateInput = {}) {
  const { page, limit, offset } = paginate({ page: query.page, limit: query.limit ?? 50 });
  const [rows, total] = await Promise.all([
    db.select().from(messages).orderBy(desc(messages.createdAt)).limit(limit).offset(offset),
    db.$count(messages),
  ]);
  return { rows, meta: { page, limit, total } };
}

export async function updateAdminMessage(
  db: Database,
  id: string,
  patch: { isRead?: boolean; isArchived?: boolean }
) {
  const [updated] = await db
    .update(messages)
    .set(patch)
    .where(eq(messages.id, id))
    .returning();
  return updated ?? null;
}
