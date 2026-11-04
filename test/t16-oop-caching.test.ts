import { describe, expect, it, vi } from 'vitest';
import type { Context } from 'hono';
import { MemoryCacheService } from '@/core/cache/memory-cache.service';
import { generateEtag, isNotModified } from '@/core/cache/http-cache';
import { SiteService } from '@/services/site.service';
import { ProjectService } from '@/services/project.service';
import { CertificationService } from '@/services/certification.service';
import type { ISiteRepository, RawSiteData } from '@/repositories/site.repository';
import type { IProjectRepository } from '@/repositories/project.repository';
import type { ICertificationRepository } from '@/repositories/certification.repository';
import { app } from '@/index';
import { setTestDb, type DbClient } from '@/db/client';

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

  describe('SiteService with Dependency Injection', () => {
    it('caches site aggregation results and avoids redundant repository calls', async () => {
      const cache = new MemoryCacheService();
      const mockRawData: RawSiteData = {
        profileRows: [
          {
            id: 1,
            name: 'Jidan',
            headlineEn: 'Fullstack Engineer',
            headlineId: 'Insinyur Perangkat Lunak',
            bioEn: 'Bio in English',
            bioId: 'Bio dalam Bahasa Indonesia',
            avatarMediaId: null,
            location: 'Jakarta',
            timezone: 'Asia/Jakarta',
            email: 'test@example.com',
            socials: {},
            availability: 'open_to_work',
            workPreference: 'remote',
            languages: [],
            interests: [],
            referencesNoteEn: null,
            referencesNoteId: null,
            careerStartDate: '2020-01-01',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        settingsRows: [],
        techRows: [],
        projectRows: [],
        experienceRows: [],
        educationRows: [],
        certRows: [],
        activityRows: [],
        achievementRows: [],
        publicationRows: [],
        testimonialRows: [],
        githubRows: [],
        projTechRows: [],
        projLinkRows: [],
        projMediaRows: [],
        expTechRows: [],
        allMediaRows: [],
      };

      const mockRepo: ISiteRepository = {
        fetchSiteAggregate: vi.fn().mockResolvedValue(mockRawData),
      };

      const siteService = new SiteService(mockRepo, cache);

      const res1 = await siteService.getSite('en');
      expect(res1.profile?.name).toBe('Jidan');
      expect(mockRepo.fetchSiteAggregate).toHaveBeenCalledTimes(1);

      // Second call must hit cache
      const res2 = await siteService.getSite('en');
      expect(res2.profile?.name).toBe('Jidan');
      expect(mockRepo.fetchSiteAggregate).toHaveBeenCalledTimes(1);

      // Invalidate cache and call again
      await siteService.invalidateCache();
      await siteService.getSite('en');
      expect(mockRepo.fetchSiteAggregate).toHaveBeenCalledTimes(2);
    });
  });

  describe('ProjectService and CertificationService with Dependency Injection', () => {
    it('caches project queries and respects cache tags', async () => {
      const cache = new MemoryCacheService();
      const mockRepo: IProjectRepository = {
        findPublishedProjects: vi.fn().mockResolvedValue([]),
        findPublishedTechnologies: vi.fn().mockResolvedValue([]),
        findProjectRelations: vi.fn().mockResolvedValue({
          projTechRows: [],
          projLinkRows: [],
          projMediaRows: [],
        }),
        findProjectDetailRelations: vi.fn().mockResolvedValue({
          projTechRows: [],
          projLinkRows: [],
          projMediaRows: [],
          techRows: [],
        }),
        loadMedia: vi.fn().mockResolvedValue([]),
      };

      const projectService = new ProjectService(mockRepo, cache);
      const res = await projectService.listProjects({ locale: 'en' });
      expect(res.items).toEqual([]);
      expect(mockRepo.findPublishedProjects).toHaveBeenCalledTimes(1);

      // Second call hits cache
      await projectService.listProjects({ locale: 'en' });
      expect(mockRepo.findPublishedProjects).toHaveBeenCalledTimes(1);
    });

    it('caches certification queries with CertificationService', async () => {
      const cache = new MemoryCacheService();
      const mockCertRepo: ICertificationRepository = {
        findPublishedCertifications: vi.fn().mockResolvedValue([]),
        findActiveMedia: vi.fn().mockResolvedValue([]),
      };

      const certService = new CertificationService(mockCertRepo, cache);
      const res = await certService.listCertifications({ locale: 'en' });
      expect(res).toEqual([]);
      expect(mockCertRepo.findPublishedCertifications).toHaveBeenCalledTimes(1);

      // Second call hits cache
      await certService.listCertifications({ locale: 'en' });
      expect(mockCertRepo.findPublishedCertifications).toHaveBeenCalledTimes(1);
    });
  });

  describe('Public HTTP Endpoints with Caching & ETags', () => {
    it('returns ETag and Cache-Control headers, and responds with 304 when ETag matches', async () => {
      const mockDb = {
        select: () => ({
          from: () => {
            const result: unknown[] = [];
            const promise = Promise.resolve(result);
            return Object.assign(promise, {
              where: () => {
                const wherePromise = Promise.resolve(result);
                return Object.assign(wherePromise, {
                  orderBy: () => Promise.resolve(result),
                });
              },
              orderBy: () => Promise.resolve(result),
            });
          },
        }),
      } as unknown as DbClient;

      setTestDb(mockDb);

      const res = await app.request('/v1/projects?locale=en');
      expect(res.status).toBe(200);
      const etag = res.headers.get('ETag');
      expect(etag).toBeTruthy();
      expect(res.headers.get('Cache-Control')).toContain('public');

      // Send request with If-None-Match
      const cachedRes = await app.request('/v1/projects?locale=en', {
        headers: {
          'If-None-Match': etag ?? '',
        },
      });
      expect(cachedRes.status).toBe(304);

      setTestDb(null);
    });
  });
});
