import { desc, eq, gte, lt } from 'drizzle-orm';
import type { Database } from '../db/client';
import { dailyStats, events, githubCache, messages } from '../db/schema';
import type { Env } from '../types/env';

export async function aggregateEventsForDate(db: Database, dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);

  const allEvents = await db.select().from(events);
  const dayEvents = allEvents.filter((ev) => {
    const t = ev.createdAt instanceof Date ? ev.createdAt.getTime() : new Date(String(ev.createdAt)).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });

  const groups = new Map<
    string,
    {
      date: string;
      type: (typeof dayEvents)[number]['type'];
      path: string;
      target: string;
      count: number;
      visitors: Set<string>;
    }
  >();

  for (const ev of dayEvents) {
    const path = ev.path ?? '';
    const target = ev.target ?? '';
    const key = `${dateStr}|${ev.type}|${path}|${target}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        date: dateStr,
        type: ev.type,
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
    type: g.type,
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

export async function runNightlyCron(db: Database, env: Env, referenceNow = new Date()) {
  const yesterday = new Date(referenceNow.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const agg = await aggregateEventsForDate(db, yesterday);

  // Prune raw events older than 90 days
  const cutoff90d = new Date(referenceNow.getTime() - 90 * 24 * 60 * 60 * 1000);
  await db.delete(events).where(lt(events.createdAt, cutoff90d));

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
      const res = await fetch(
        `https://api.github.com/users/${encodeURIComponent(env.GITHUB_USERNAME)}`,
        { headers }
      );
      if (res.ok) {
        const profileData = (await res.json()) as Record<string, unknown>;
        await db.delete(githubCache).where(eq(githubCache.key, 'summary'));
        await db.insert(githubCache).values({
          key: 'summary',
          data: profileData,
          fetchedAt: new Date(),
        });
      }
    } catch {
      // Ignore network errors during GitHub cache refresh
    }
  }

  return agg;
}

export async function getAdminAnalytics(db: Database, range: '7d' | '30d' | '90d' = '30d') {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const stats = await db
    .select()
    .from(dailyStats)
    .where(gte(dailyStats.date, sinceDate));

  let totalViews = 0;
  let uniqueVisitors = 0;
  let cvDownloads = 0;

  const byDate = new Map<string, { date: string; views: number; visitors: number }>();
  const byPath = new Map<string, number>();

  for (const row of stats) {
    if (row.type === 'page_view') {
      totalViews += row.count;
      uniqueVisitors += row.uniqueVisitors;
      const entry = byDate.get(row.date) ?? { date: row.date, views: 0, visitors: 0 };
      entry.views += row.count;
      entry.visitors += row.uniqueVisitors;
      byDate.set(row.date, entry);
      byPath.set(row.path, (byPath.get(row.path) ?? 0) + row.count);
    }
    if (row.type === 'cv_download' || row.type === 'export_download') {
      cvDownloads += row.count;
    }
  }


  const allMessages = await db.select().from(messages);

  return {
    range,
    totals: {
      views: totalViews,
      uniqueVisitors,
      cvDownloads,
      contactSubmissions: allMessages.length,
    },
    series: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
    topPaths: Array.from(byPath.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}

export async function listAdminMessages(db: Database) {
  return db.select().from(messages).orderBy(desc(messages.createdAt));
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
