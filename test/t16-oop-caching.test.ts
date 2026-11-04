import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Context } from 'hono';
import { MemoryCacheService } from '@/core/cache/memory-cache.service';
import { generateEtag, isNotModified } from '@/core/cache/http-cache';
import { SiteService } from '@/services/site.service';
import { ProjectService } from '@/services/project.service';
import { CertificationService } from '@/services/certification.service';
import { DrizzleSiteRepository } from '@/repositories/site.repository';
import { DrizzleProjectRepository } from '@/repositories/project.repository';
import { DrizzleCertificationRepository } from '@/repositories/certification.repository';
import { defaultCacheService } from '@/core/cache/memory-cache.service';
import { app } from '@/index';
import { setTestDb, type DbClient } from '@/db/client';
import { lk } from '@/db/queries/lookups';
import * as schema from '@/db/schema';
import { createTestDb, insertOrganization, published, useTestDb } from './helpers/db';

describe('T16 · OOP Architecture, Clean Code & Caching', () => {
  describe('MemoryCacheService (SOLID & TypeSafe)', () => {
    it('sets, gets and deletes typed items', async () => {
      const cache = new MemoryCacheService();
      await cache.set('user:1', { name: 'Jidan' });

      const item = await cache.get<{ name: string }>('user:1');
      expect(item).toEqual({ name: 'Jidan' });

      await cache.delete('user:1');
      expect(await cache.get('user:1')).toBeNull();
    });

    it('handles TTL expiration', async () => {
      const cache = new MemoryCacheService();
      // Set with negative second TTL (expired immediately)
      await cache.set('temp', 'value', { ttlSeconds: -1 });
      expect(await cache.get('temp')).toBeNull();
    });

    it('implements Cache-Aside pattern via remember()', async () => {
      const cache = new MemoryCacheService();
      const fetcher = vi.fn().mockResolvedValue({ status: 'ok' });

      const first = await cache.remember('key', 60, fetcher);
      expect(first).toEqual({ status: 'ok' });
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Second call must return from cache without re-invoking fetcher
      const second = await cache.remember('key', 60, fetcher);
      expect(second).toEqual({ status: 'ok' });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('invalidates cache by tags efficiently', async () => {
      const cache = new MemoryCacheService();
      await cache.set('site:en', { title: 'Site EN' }, { tags: ['site'] });
      await cache.set('site:id', { title: 'Site ID' }, { tags: ['site'] });
      await cache.set('projects:list', [{ id: 'p1' }], { tags: ['projects'] });

      expect(await cache.get('site:en')).not.toBeNull();
      expect(await cache.get('projects:list')).not.toBeNull();

      // Invalidate tag 'site'
      await cache.invalidateTag('site');
      expect(await cache.get('site:en')).toBeNull();
      expect(await cache.get('site:id')).toBeNull();

      // 'projects' tag remains untouched
      expect(await cache.get('projects:list')).not.toBeNull();
    });
  });

  describe('HTTP Caching (ETag & Conditional 304)', () => {
    it('generates consistent ETag for identical objects', async () => {
      const dataA = { id: 1, name: 'Project Alpha' };
      const dataB = { id: 1, name: 'Project Alpha' };

      const etagA = await generateEtag(dataA);
      const etagB = await generateEtag(dataB);

      expect(etagA).toBe(etagB);
      expect(etagA.startsWith('W/"')).toBe(true);
    });

    it('detects 304 Not Modified when ETag matches', () => {
      const mockContext = {
        req: {
          header: (name: string) => (name === 'if-none-match' ? 'W/"abc12345"' : undefined),
        },
      } as unknown as Context;

      expect(isNotModified(mockContext, 'W/"abc12345"')).toBe(true);
      expect(isNotModified(mockContext, 'W/"different"')).toBe(false);
    });
  });

  // Real repositories over a migrated PGlite database; a spy counts how often they hit the DB.
  async function seed(db: DbClient) {
    await db.insert(schema.profile).values({
      name: 'Jidan',
      headlineEn: 'Fullstack Engineer',
      headlineId: 'Insinyur Perangkat Lunak',
      bioEn: 'Bio in English',
      availabilityId: lk('availability', 'open_to_work'),
      workPreferenceId: lk('work_mode', 'remote'),
      careerStartDate: '2020-01-01',
    });
    const issuer = await insertOrganization(db, { name: 'AWS', type: 'certification_issuer' });
    await db.insert(schema.projects).values({
      slug: 'alpha',
      titleEn: 'Project Alpha',
      summaryEn: 'First project',
      typeId: lk('project_type', 'personal'),
      stateId: lk('project_state', 'live'),
      ...published(),
    });
    await db.insert(schema.certifications).values({
      typeId: lk('cert_type', 'course'),
      name: 'Cloud Basics',
      issuerOrganizationId: issuer,
      ...published(),
    });
  }

  describe('SiteService with Dependency Injection', () => {
    it('caches site aggregation results and avoids redundant repository calls', async () => {
      const db = await createTestDb();
      await seed(db);
      const repo = new DrizzleSiteRepository(db);
      const fetchSpy = vi.spyOn(repo, 'fetchSiteAggregate');
      const siteService = new SiteService(repo, new MemoryCacheService());

      const res1 = await siteService.getSite('en');
      expect(res1.profile?.name).toBe('Jidan');
      expect(res1.profile?.availability).toMatchObject({ code: 'open_to_work', label: 'Open to work' });
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call must hit cache
      const res2 = await siteService.getSite('en');
      expect(res2).toBe(res1);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Locales are cached separately (labels differ)
      const resId = await siteService.getSite('id');
      expect(resId.profile?.headline).toBe('Insinyur Perangkat Lunak');
      expect(resId.profile?.availability.label).toBe('Siap bekerja');
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      // Invalidate cache: the next call re-reads the database and sees new data
      await db.update(schema.profile).set({ name: 'Jidan F.' });
      expect((await siteService.getSite('en')).profile?.name).toBe('Jidan');
      await siteService.invalidateCache();
      expect((await siteService.getSite('en')).profile?.name).toBe('Jidan F.');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('ProjectService and CertificationService with Dependency Injection', () => {
    it('caches project queries and respects cache tags', async () => {
      const db = await createTestDb();
      await seed(db);
      const cache = new MemoryCacheService();
      const repo = new DrizzleProjectRepository(db);
      const listSpy = vi.spyOn(repo, 'findPublishedProjects');
      const projectService = new ProjectService(repo, cache);

      const res = await projectService.listProjects({ locale: 'en' });
      expect(res.items.map((p) => p.slug)).toEqual(['alpha']);
      expect(res.items[0]?.type).toMatchObject({ code: 'personal', label: 'Personal' });
      expect(listSpy).toHaveBeenCalledTimes(1);

      // Second call hits cache
      await projectService.listProjects({ locale: 'en' });
      expect(listSpy).toHaveBeenCalledTimes(1);

      // Detail is cached under its own key, same 'projects' tag
      const detail = await projectService.getProjectBySlug('alpha', 'en');
      expect(detail.title).toBe('Project Alpha');
      await projectService.getProjectBySlug('alpha', 'en');
      expect(listSpy).toHaveBeenCalledTimes(2);

      // Unrelated tag leaves projects cached; the 'projects' tag clears list and detail
      await cache.invalidateTag('site');
      await projectService.listProjects({ locale: 'en' });
      expect(listSpy).toHaveBeenCalledTimes(2);
      await projectService.invalidateCache();
      await projectService.listProjects({ locale: 'en' });
      await projectService.getProjectBySlug('alpha', 'en');
      expect(listSpy).toHaveBeenCalledTimes(4);
    });

    it('caches certification queries with CertificationService', async () => {
      const db = await createTestDb();
      await seed(db);
      const repo = new DrizzleCertificationRepository(db);
      const findSpy = vi.spyOn(repo, 'findPublishedCertifications');
      const certService = new CertificationService(repo, new MemoryCacheService());

      const res = await certService.listCertifications({ locale: 'en' });
      expect(res.map((c) => c.name)).toEqual(['Cloud Basics']);
      expect(res[0]).toMatchObject({ type: { code: 'course' }, issuer: { name: 'AWS' } });
      expect(findSpy).toHaveBeenCalledTimes(1);

      // Second call hits cache
      await certService.listCertifications({ locale: 'en' });
      expect(findSpy).toHaveBeenCalledTimes(1);

      // A different type filter is a different cache entry
      expect(await certService.listCertifications({ locale: 'en', type: 'bootcamp' })).toEqual([]);
      expect(findSpy).toHaveBeenCalledTimes(2);

      await certService.invalidateCache();
      await certService.listCertifications({ locale: 'en' });
      expect(findSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Public HTTP Endpoints with Caching & ETags', () => {
    afterEach(async () => {
      setTestDb(null);
      await defaultCacheService.clear();
    });

    it('returns ETag and Cache-Control headers, and responds with 304 when ETag matches', async () => {
      await defaultCacheService.clear();
      await seed(await useTestDb());

      const res = await app.request('/v1/projects?locale=en');
      expect(res.status).toBe(200);
      const etag = res.headers.get('ETag');
      expect(etag).toBeTruthy();
      expect(res.headers.get('Cache-Control')).toContain('public');
      const body = await res.json<{ data: { slug: string }[] }>();
      expect(body.data.map((p) => p.slug)).toEqual(['alpha']);

      // Send request with If-None-Match
      const cachedRes = await app.request('/v1/projects?locale=en', {
        headers: { 'If-None-Match': etag ?? '' },
      });
      expect(cachedRes.status).toBe(304);

      // A stale ETag gets the full body again
      const staleRes = await app.request('/v1/projects?locale=en', {
        headers: { 'If-None-Match': 'W/"stale"' },
      });
      expect(staleRes.status).toBe(200);
    });
  });
});
