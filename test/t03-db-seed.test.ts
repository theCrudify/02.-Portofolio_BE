import { describe, expect, it } from 'vitest';
import { asc, eq, getTableName, is } from 'drizzle-orm';
import { lk } from '@/db/queries/lookups';
import { PgTable } from 'drizzle-orm/pg-core';
import * as schema from '@/db/schema';
import { paginate, parseSort, publishedOnly } from '@/db/queries/common';
import { hashPassword, verifyPassword } from '@/lib/password';
import { SEED_TECHNOLOGIES, seedDatabase } from '../scripts/seed';
import { createTestDb, draft, insertOrganization, published } from './helpers/db';

const SEED_OPTS = {
  ownerEmail: 'owner@test.local',
  ownerPassword: 'OwnerSecurePassword123!',
  ownerName: 'Test Owner',
};

describe('T03 · Database Schema, Password PBKDF2, Common Queries & Seed', () => {
  it('exports exactly the tables of the lookup-based schema', () => {
    const expectedTableNames = [
      'lookup_groups',
      'lookups',
      'users',
      'login_attempts',
      'audit_logs',
      'media',
      'organizations',
      'profile',
      'profile_socials',
      'profile_languages',
      'profile_interests',
      'site_settings',
      'site_sections',
      'technologies',
      'projects',
      'project_responsibilities',
      'project_highlights',
      'project_metrics',
      'project_technologies',
      'project_links',
      'project_media',
      'experiences',
      'experience_responsibilities',
      'experience_achievements',
      'experience_projects',
      'experience_technologies',
      'education',
      'education_activities',
      'certifications',
      'certification_achievements',
      'certification_links',
      'certification_media',
      'certification_technologies',
      'activities',
      'activity_achievements',
      'activity_links',
      'activity_media',
      'activity_technologies',
      'achievements',
      'achievement_points',
      'achievement_links',
      'achievement_media',
      'achievement_technologies',
      'publications',
      'testimonials',
      'documents',
      'export_presets',
      'export_preset_sections',
      'export_preset_technologies',
      'share_links',
      'messages',
      'events',
      'daily_stats',
      'github_cache',
    ];

    const actualTableNames = (Object.values(schema) as unknown[])
      .filter((v): v is PgTable => is(v, PgTable))
      .map((t) => getTableName(t));

    expect(actualTableNames).toHaveLength(54);
    expect([...actualTableNames].sort()).toEqual([...expectedTableNames].sort());
  });

  it('hashes and verifies passwords with PBKDF2-SHA256 (100,000 iterations)', async () => {
    const plain = 'SuperSecretOwnerPass123!';
    const hashed = await hashPassword(plain);

    expect(hashed.startsWith('pbkdf2$sha256$100000$')).toBe(true);
    expect(hashed.split('$')).toHaveLength(5);

    expect(await verifyPassword(plain, hashed)).toBe(true);
    expect(await verifyPassword('WrongPassword123!', hashed)).toBe(false);
    expect(await verifyPassword(plain, 'invalid$format')).toBe(false);
  });

  it('builds common query helpers (publishedOnly, paginate, parseSort) that run on Postgres', async () => {
    const db = await createTestDb();
    await insertOrganization(db, { name: 'Visible Co' });
    await db.insert(schema.organizations).values({
      name: 'Draft Co',
      slug: 'draft-co',
      typeId: lk('organization_type', 'company'),
      ...draft(),
    });
    await db.insert(schema.organizations).values({
      name: 'Deleted Co',
      slug: 'deleted-co',
      typeId: lk('organization_type', 'company'),
      ...published(),
      deletedAt: new Date(),
    });

    const visible = await db
      .select({ slug: schema.organizations.slug })
      .from(schema.organizations)
      .where(publishedOnly(schema.organizations));
    expect(visible.map((r) => r.slug)).toEqual(['visible-co']);

    expect(paginate({ page: 1, limit: 20 })).toEqual({ page: 1, limit: 20, offset: 0 });
    expect(paginate({ page: 3, limit: 250 })).toEqual({ page: 3, limit: 100, offset: 200 });
    expect(paginate({ page: -1, limit: 0 })).toEqual({ page: 1, limit: 20, offset: 0 });

    const allowed = { name: schema.organizations.name, slug: schema.organizations.slug };
    const byNameDesc = await db
      .select({ name: schema.organizations.name })
      .from(schema.organizations)
      .orderBy(parseSort('-name', allowed, schema.organizations.slug));
    expect(byNameDesc.map((r) => r.name)).toEqual(['Visible Co', 'Draft Co', 'Deleted Co']);

    // Unknown sort key falls back to the default column.
    const fallback = await db
      .select({ slug: schema.organizations.slug })
      .from(schema.organizations)
      .orderBy(parseSort('-nope', allowed, schema.organizations.slug));
    const expected = await db
      .select({ slug: schema.organizations.slug })
      .from(schema.organizations)
      .orderBy(asc(schema.organizations.slug));
    expect(fallback).toEqual(expected);
  });

  it('runs seedDatabase idempotently on a migrated DB without duplicating records', async () => {
    expect(SEED_TECHNOLOGIES).toHaveLength(15);
    const db = await createTestDb();

    const lookupsBefore = await db.$count(schema.lookups);
    const groupsBefore = await db.$count(schema.lookupGroups);
    expect(lookupsBefore).toBeGreaterThan(0);

    const tables = {
      users: schema.users,
      profile: schema.profile,
      profile_socials: schema.profileSocials,
      profile_languages: schema.profileLanguages,
      profile_interests: schema.profileInterests,
      site_settings: schema.siteSettings,
      site_sections: schema.siteSections,
      technologies: schema.technologies,
      organizations: schema.organizations,
      projects: schema.projects,
      project_metrics: schema.projectMetrics,
      project_highlights: schema.projectHighlights,
      project_responsibilities: schema.projectResponsibilities,
      experiences: schema.experiences,
      experience_responsibilities: schema.experienceResponsibilities,
      experience_achievements: schema.experienceAchievements,
      experience_projects: schema.experienceProjects,
      education: schema.education,
      education_activities: schema.educationActivities,
      certifications: schema.certifications,
      activities: schema.activities,
      activity_achievements: schema.activityAchievements,
      export_presets: schema.exportPresets,
      export_preset_sections: schema.exportPresetSections,
    };
    const snapshot = async () => {
      const out: Record<string, number> = {};
      for (const [name, table] of Object.entries(tables)) out[name] = await db.$count(table);
      return out;
    };

    await seedDatabase(db, SEED_OPTS);
    const first = await snapshot();
    await seedDatabase(db, SEED_OPTS);
    const second = await snapshot();

    expect(second).toEqual(first);
    expect(await db.$count(schema.lookups)).toBe(lookupsBefore);
    expect(await db.$count(schema.lookupGroups)).toBe(groupsBefore);

    expect(first).toMatchObject({
      users: 1,
      profile: 1,
      profile_socials: 2,
      profile_languages: 2,
      profile_interests: 2,
      site_settings: 1,
      technologies: 15,
      organizations: 5,
      projects: 2,
      project_metrics: 3,
      project_highlights: 3,
      project_responsibilities: 3,
      experiences: 1,
      experience_responsibilities: 1,
      experience_achievements: 1,
      experience_projects: 2,
      education: 1,
      education_activities: 1,
      certifications: 1,
      activities: 1,
      activity_achievements: 1,
      export_presets: 3,
      export_preset_sections: 8 + 4 + 5,
    });
    expect(first.site_sections).toBeGreaterThan(0);

    // Both seeded projects hang off the seeded experience.
    const [exp] = await db.select({ id: schema.experiences.id }).from(schema.experiences);
    const linked = await db
      .select({ slug: schema.projects.slug })
      .from(schema.experienceProjects)
      .innerJoin(schema.projects, eq(schema.projects.id, schema.experienceProjects.projectId))
      .where(eq(schema.experienceProjects.experienceId, exp!.id))
      .orderBy(asc(schema.experienceProjects.sortOrder));
    expect(linked.map((r) => r.slug)).toEqual(['cashier-app', 'edge-analytics-engine']);

    const [owner] = await db.select().from(schema.users);
    expect(owner!.email).toBe('owner@test.local');
    expect(await verifyPassword('OwnerSecurePassword123!', owner!.passwordHash)).toBe(true);
    const [role] = await db
      .select({ code: schema.lookups.code })
      .from(schema.lookups)
      .where(eq(schema.lookups.id, owner!.roleId));
    expect(role!.code).toBe('owner');
  });
});
