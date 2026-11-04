import { desc, eq, isNull } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { Database } from '../db/client';
import { loadLookups } from '../db/queries/lookups';
import {
  auditLogs,
  certifications,
  messages,
  profile,
  profileInterests,
  profileLanguages,
  profileSocials,
  siteSections,
  siteSettings,
} from '../db/schema';
import { revalidate } from '../lib/revalidate';
import type { AuthUser, Env } from '../types/env';
import { writeAuditLog } from './audit.service';
import {
  assertLookupGroups,
  childStatements,
  runBatch,
  selectWithStatus,
} from './content-store';
import { RESOURCE_REGISTRY, type ChildSpec, type ResourceConfig } from './resource-registry';

/* ---------- profile (singleton id = 1) ---------- */

const PROFILE_CHILDREN: ChildSpec[] = [
  {
    key: 'socials',
    table: profileSocials,
    parentKey: 'profileId',
    fields: ['platformId', 'url', 'handle'],
    sorted: true,
    lookupFields: { platformId: 'social_platform' },
  },
  {
    key: 'languages',
    table: profileLanguages,
    parentKey: 'profileId',
    fields: ['nameEn', 'nameId', 'levelId'],
    sorted: true,
    lookupFields: { levelId: 'language_level' },
  },
  {
    key: 'interests',
    table: profileInterests,
    parentKey: 'profileId',
    fields: ['labelEn', 'labelId', 'icon'],
    sorted: true,
  },
];

// Only the validation-relevant parts of a ResourceConfig are used for singletons.
const PROFILE_CONFIG = {
  lookupFields: { availabilityId: 'availability', workPreferenceId: 'work_mode' },
  children: PROFILE_CHILDREN,
} as unknown as ResourceConfig;

const SETTINGS_CONFIG = {
  lookupFields: {
    themePresetId: 'theme_preset',
    colorModeId: 'color_mode',
    fontPairId: 'font_pair',
    heroCvButtonsId: 'hero_cv_buttons',
  },
  children: [
    { key: 'sections', table: siteSections, parentKey: '', fields: [], sorted: true, lookupFields: { sectionId: 'site_section' } },
  ],
} as unknown as ResourceConfig;

const ordered = <T extends { sortOrder: number }>(rows: T[]) =>
  [...rows].sort((a, b) => a.sortOrder - b.sortOrder);

export async function getAdminProfile(db: Database) {
  const [[row], socials, languages, interests] = await Promise.all([
    db.select().from(profile).where(eq(profile.id, 1)).limit(1),
    db.select().from(profileSocials),
    db.select().from(profileLanguages),
    db.select().from(profileInterests),
  ]);
  if (!row) return null;
  return {
    ...row,
    socials: ordered(socials).map(({ platformId, url, handle }) => ({ platformId, url, handle })),
    languages: ordered(languages).map(({ nameEn, nameId, levelId }) => ({ nameEn, nameId, levelId })),
    interests: ordered(interests).map(({ labelEn, labelId, icon }) => ({ labelEn, labelId, icon })),
  };
}

export async function updateAdminProfile(
  db: Database,
  env: Env,
  user: AuthUser,
  payload: Record<string, unknown>,
) {
  assertLookupGroups(await loadLookups(db), PROFILE_CONFIG, payload);
  const childKeys = new Set(PROFILE_CHILDREN.map((c) => c.key));
  const columns = Object.fromEntries(Object.entries(payload).filter(([k]) => !childKeys.has(k)));

  await runBatch(db, [
    db.update(profile).set({ ...columns, updatedAt: new Date() }).where(eq(profile.id, 1)),
    ...PROFILE_CHILDREN.filter((spec) => Array.isArray(payload[spec.key])).flatMap((spec) =>
      // profile_id is a smallint; the generic helper only needs it as the FK value.
      childStatements(db, spec, 1 as unknown as string, payload[spec.key] as Record<string, unknown>[]),
    ),
  ]);

  await writeAuditLog(db, {
    userId: user.id,
    action: 'update',
    resource: 'profile',
    resourceId: '1',
    summary: 'Updated profile',
  });
  await revalidate(env, ['site']);
  return getAdminProfile(db);
}

/* ---------- site settings (singleton id = 1) ---------- */

export async function getAdminSiteSettings(db: Database) {
  const [[row], sections] = await Promise.all([
    db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1),
    db.select().from(siteSections),
  ]);
  if (!row) return null;
  return {
    ...row,
    sections: ordered(sections).map(({ sectionId, isVisible }) => ({ sectionId, isVisible })),
  };
}

export async function updateAdminSiteSettings(
  db: Database,
  env: Env,
  user: AuthUser,
  payload: Record<string, unknown>,
) {
  assertLookupGroups(await loadLookups(db), SETTINGS_CONFIG, payload);
  const { sections, ...columns } = payload as { sections?: { sectionId: string; isVisible: boolean }[] };

  const statements: BatchItem<'pg'>[] = [
    db.update(siteSettings).set({ ...columns, updatedAt: new Date() }).where(eq(siteSettings.id, 1)),
  ];
  if (sections) {
    // The list is the full home-page order: replace it as a whole.
    statements.push(db.delete(siteSections));
    if (sections.length > 0) {
      statements.push(
        db.insert(siteSections).values(
          sections.map((s, i) => ({ sectionId: s.sectionId, isVisible: s.isVisible, sortOrder: i })),
        ),
      );
    }
  }
  await runBatch(db, statements);

  await writeAuditLog(db, {
    userId: user.id,
    action: 'settings',
    resource: 'site_settings',
    resourceId: '1',
    summary: 'Updated site settings',
  });
  await revalidate(env, ['site', 'projects', 'certifications']);
  return getAdminSiteSettings(db);
}

/* ---------- dashboard ---------- */

export async function getAdminDashboardSummary(db: Database) {
  const [allProjects, allCerts, allMessages, recentLogs, lookups] = await Promise.all([
    selectWithStatus(db, RESOURCE_REGISTRY.projects.table).where(
      isNull(RESOURCE_REGISTRY.projects.table.deletedAt),
    ) as Promise<{ status: string }[]>,
    db.select().from(certifications).where(isNull(certifications.deletedAt)),
    db.select().from(messages),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(10),
    loadLookups(db),
  ]);

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  return {
    counts: {
      projectsPublished: allProjects.filter((p) => p.status === 'published').length,
      projectsDraft: allProjects.filter((p) => p.status === 'draft').length,
      unreadMessages: allMessages.filter((m) => !m.isRead && !m.isArchived).length,
    },
    expiringCertifications: allCerts.filter(
      (c) => c.expiryDate && c.expiryDate >= todayStr && c.expiryDate <= in30Days,
    ),
    recentAuditLogs: recentLogs.map((log) => ({ ...log, action: lookups.code(log.actionId) ?? '' })),
  };
}
