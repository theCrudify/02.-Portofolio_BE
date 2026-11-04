import { describe, expect, it } from 'vitest';
import { getTableName } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { paginate, parseSort, publishedOnly } from '@/db/queries/common';
import { hashPassword, verifyPassword } from '@/lib/password';
import { SEED_TECHNOLOGIES, seedDatabase } from '../scripts/seed';
import type { DbClient } from '@/db/client';

describe('T03 · Database Schema, Password PBKDF2, Common Queries & Seed', () => {
  it('defines all 26 tables in schema.ts matching 02-DATABASE-SCHEMA.md', () => {
    const expectedTableNames = [
      'users',
      'login_attempts',
      'audit_logs',
      'media',
      'profile',
      'site_settings',
      'technologies',
      'projects',
      'project_technologies',
      'project_links',
      'project_media',
      'experiences',
      'experience_technologies',
      'education',
      'certifications',
      'activities',
      'achievements',
      'publications',
      'testimonials',
      'documents',
      'export_presets',
      'share_links',
      'messages',
      'events',
      'daily_stats',
      'github_cache',
    ];

    const actualTableNames = [
      getTableName(schema.users),
      getTableName(schema.loginAttempts),
      getTableName(schema.auditLogs),
      getTableName(schema.media),
      getTableName(schema.profile),
      getTableName(schema.siteSettings),
      getTableName(schema.technologies),
      getTableName(schema.projects),
      getTableName(schema.projectTechnologies),
      getTableName(schema.projectLinks),
      getTableName(schema.projectMedia),
      getTableName(schema.experiences),
      getTableName(schema.experienceTechnologies),
      getTableName(schema.education),
      getTableName(schema.certifications),
      getTableName(schema.activities),
      getTableName(schema.achievements),
      getTableName(schema.publications),
      getTableName(schema.testimonials),
      getTableName(schema.documents),
      getTableName(schema.exportPresets),
      getTableName(schema.shareLinks),
      getTableName(schema.messages),
      getTableName(schema.events),
      getTableName(schema.dailyStats),
      getTableName(schema.githubCache),
    ];

    expect(actualTableNames).toHaveLength(26);
    expect(actualTableNames).toEqual(expectedTableNames);
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

  it('builds common query helpers (publishedOnly, paginate, parseSort)', () => {
    const cond = publishedOnly(schema.projects);
    expect(cond).toBeDefined();

    expect(paginate({ page: 1, limit: 20 })).toEqual({ page: 1, limit: 20, offset: 0 });
    expect(paginate({ page: 3, limit: 250 })).toEqual({ page: 3, limit: 100, offset: 200 });
    expect(paginate({ page: -1, limit: 0 })).toEqual({ page: 1, limit: 20, offset: 0 });

    const sortSql = parseSort(
      '-createdAt',
      {
        sortOrder: schema.projects.sortOrder,
        createdAt: schema.projects.createdAt,
      },
      schema.projects.sortOrder,
    );
    expect(sortSql).toBeDefined();
  });

  it('runs seedDatabase idempotently without duplicating records', async () => {
    expect(SEED_TECHNOLOGIES).toHaveLength(15);

    const store = new Map<string, Record<string, unknown>[]>();
    const getList = (t: unknown) => {
      const name = getTableName(t as Parameters<typeof getTableName>[0]);
      if (!store.has(name)) {
        store.set(name, []);
      }
      return store.get(name)!;
    };

    const mockDb = {
      select: () => ({
        from: (table: unknown) => {
          const rows = getList(table);
          const promise = Promise.resolve(rows);
          return Object.assign(promise, {
            where: () => Promise.resolve(rows),
          });
        },
      }),
      insert: (table: unknown) => ({
        values: (val: Record<string, unknown>) => {
          const rows = getList(table);
          const name = getTableName(table as Parameters<typeof getTableName>[0]);
          const addIfNotDuplicate = () => {
            const exists = rows.some(
              (r) =>
                (val.id !== undefined && r.id === val.id) ||
                (val.slug !== undefined && r.slug === val.slug) ||
                (val.email !== undefined && r.email === val.email),
            );
            if (!exists) {
              rows.push({ ...val, _table: name });
            }
          };
          addIfNotDuplicate();
          const promise = Promise.resolve();
          return Object.assign(promise, {
            onConflictDoNothing: () => Promise.resolve(),
          });
        },
      }),
    } as unknown as DbClient;

    await seedDatabase(mockDb, {
      ownerEmail: 'owner@test.local',
      ownerPassword: 'OwnerSecurePassword123!',
      ownerName: 'Test Owner',
    });

    await seedDatabase(mockDb, {
      ownerEmail: 'owner@test.local',
      ownerPassword: 'OwnerSecurePassword123!',
      ownerName: 'Test Owner',
    });

    expect(store.get('users')).toHaveLength(1);
    expect(store.get('profile')).toHaveLength(1);
    expect(store.get('site_settings')).toHaveLength(1);
    expect(store.get('technologies')).toHaveLength(15);
    expect(store.get('projects')).toHaveLength(2);
    expect(store.get('experiences')).toHaveLength(1);
    expect(store.get('education')).toHaveLength(1);
    expect(store.get('certifications')).toHaveLength(1);
    expect(store.get('activities')).toHaveLength(1);
    expect(store.get('export_presets')).toHaveLength(3);

    const ownerRow = store.get('users')![0]!;
    expect(
      await verifyPassword('OwnerSecurePassword123!', ownerRow.passwordHash as string),
    ).toBe(true);
  });
});

