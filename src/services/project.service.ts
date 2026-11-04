import type { DbClient } from '@/db/client';
import { defaultCacheService } from '@/core/cache/memory-cache.service';
import type { ICacheService } from '@/core/cache/cache.interface';
import { paginate } from '@/db/queries/common';
import { notFound } from '@/lib/errors';
import { pickLocale, type SupportedLocale } from '@/lib/locale';
import {
  DrizzleProjectRepository,
  type IProjectRepository,
} from '@/repositories/project.repository';
import {
  toProjectCard,
  toProjectDetail,
  type GroupedTechnologies,
  type MediaRow,
  type TechnologyRow,
} from '@/services/serializers';

export interface ListProjectsOptions {
  locale: SupportedLocale;
  technology?: string;
  type?: 'personal' | 'freelance' | 'company' | 'open_source' | 'hackathon';
  page?: number;
  limit?: number;
}

/**
 * ProjectService: OOP service managing published projects, case study details,
 * and high-performance tag-based caching.
 */
export class ProjectService {
  constructor(
    private readonly projectRepo: IProjectRepository,
    private readonly cache: ICacheService = defaultCacheService,
  ) {}

  /**
   * List published projects with pagination and technology/type filters.
   * Cached for 180s with tag 'projects'.
   */
  async listProjects(options: ListProjectsOptions) {
    const { locale, technology, type } = options;
    const { page, limit, offset } = paginate({ page: options.page, limit: options.limit });

    const cacheKey = `projects:list:${locale}:${type ?? 'all'}:${technology ?? 'all'}:${page}:${limit}`;

    return this.cache.remember(
      cacheKey,
      180,
      async () => {
        const [allPublishedProjects, allPublishedTechs] = await Promise.all([
          this.projectRepo.findPublishedProjects(),
          this.projectRepo.findPublishedTechnologies(),
        ]);

        const techMap = new Map<string, TechnologyRow>();
        let filterTechId: string | null = null;
        for (const t of allPublishedTechs) {
          techMap.set(t.id, t);
          if (technology && t.slug === technology) {
            filterTechId = t.id;
          }
        }

        let filtered = allPublishedProjects;
        if (type) {
          filtered = filtered.filter((p) => p.type === type);
        }
        if (technology) {
          if (!filterTechId) {
            return {
              items: [],
              meta: { page, limit, total: 0 },
            };
          }
          // Query tech links from repository
          const allRelations = await this.projectRepo.findProjectRelations(
            allPublishedProjects.map((p) => p.id),
          );
          const matchingProjectIds = new Set(
            allRelations.projTechRows
              .filter((pt) => pt.technologyId === filterTechId)
              .map((pt) => pt.projectId),
          );
          filtered = filtered.filter((p) => matchingProjectIds.has(p.id));
        }

        const total = filtered.length;
        const pagedProjects = filtered.slice(offset, offset + limit);
        if (pagedProjects.length === 0) {
          return { items: [], meta: { page, limit, total } };
        }

        // Load relations only for the projects on this page.
        const pageIds = pagedProjects.map((p) => p.id);
        const { projTechRows, projLinkRows, projMediaRows } =
          await this.projectRepo.findProjectRelations(pageIds);

        const mediaRows = await this.projectRepo.loadMedia([
          ...pagedProjects.map((p) => p.coverMediaId),
          ...projMediaRows.map((pm) => pm.mediaId),
        ]);

        const mediaMap = new Map<string, MediaRow>();
        for (const m of mediaRows) {
          mediaMap.set(m.id, m);
        }

        const items = pagedProjects.map((proj) => {
          const pTechs = projTechRows
            .filter((pt) => pt.projectId === proj.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((pt) => techMap.get(pt.technologyId))
            .filter((t): t is TechnologyRow => Boolean(t));

          const pLinks = projLinkRows.filter((pl) => pl.projectId === proj.id);
          const clipRelation = projMediaRows
            .filter((pm) => pm.projectId === proj.id && pm.role === 'clip')
            .sort((a, b) => a.sortOrder - b.sortOrder)[0];
          const clipMedia = clipRelation ? mediaMap.get(clipRelation.mediaId) : null;
          const coverMedia = proj.coverMediaId ? mediaMap.get(proj.coverMediaId) : null;

          return toProjectCard(proj, coverMedia, pTechs, pLinks, clipMedia, locale);
        });

        return {
          items,
          meta: { page, limit, total },
        };
      },
      ['projects'],
    );
  }

  /**
   * Get single published project detail by slug with next/previous navigation.
   * Cached for 300s with tag 'projects'.
   */
  async getProjectBySlug(slug: string, locale: SupportedLocale) {
    const cacheKey = `project:slug:${slug}:${locale}`;

    return this.cache.remember(
      cacheKey,
      300,
      async () => {
        const allPublished = await this.projectRepo.findPublishedProjects();

        const index = allPublished.findIndex((p) => p.slug === slug);
        if (index === -1) {
          throw notFound(`Project '${slug}' not found`);
        }

        const project = allPublished[index]!;
        const prevRow = index > 0 ? allPublished[index - 1] : null;
        const nextRow = index < allPublished.length - 1 ? allPublished[index + 1] : null;

        const { projTechRows, projLinkRows, projMediaRows, techRows } =
          await this.projectRepo.findProjectDetailRelations(project.id);

        const mediaRows = await this.projectRepo.loadMedia([
          project.coverMediaId,
          project.architectureMediaId,
          ...projMediaRows.map((pm) => pm.mediaId),
        ]);

        const techMap = new Map<string, TechnologyRow>();
        for (const t of techRows) {
          techMap.set(t.id, t);
        }

        const mediaMap = new Map<string, MediaRow>();
        for (const m of mediaRows) {
          mediaMap.set(m.id, m);
        }

        const techWithGroup = projTechRows
          .filter((pt) => pt.projectId === project.id)
          .map((pt) => {
            const tech = techMap.get(pt.technologyId);
            if (!tech) return null;
            return {
              tech,
              group: pt.group as keyof GroupedTechnologies,
              sortOrder: pt.sortOrder,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        const mediaItems = projMediaRows
          .filter((pm) => pm.projectId === project.id)
          .map((pm) => {
            const media = mediaMap.get(pm.mediaId);
            if (!media) return null;
            return { relation: pm, media };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        return toProjectDetail(project, {
          coverMedia: project.coverMediaId ? mediaMap.get(project.coverMediaId) : null,
          architectureMedia: project.architectureMediaId
            ? mediaMap.get(project.architectureMediaId)
            : null,
          techWithGroup,
          links: projLinkRows.filter((pl) => pl.projectId === project.id),
          mediaItems,
          prev: prevRow
            ? {
                slug: prevRow.slug,
                title: pickLocale(prevRow, 'title', locale) ?? prevRow.titleEn,
              }
            : null,
          next: nextRow
            ? {
                slug: nextRow.slug,
                title: pickLocale(nextRow, 'title', locale) ?? nextRow.titleEn,
              }
            : null,
          locale,
        });
      },
      ['projects'],
    );
  }

  /**
   * Invalidate cached projects data.
   */
  async invalidateCache(): Promise<void> {
    await this.cache.invalidateTag('projects');
  }
}

/**
 * Functional adapter preserving backward compatibility with existing tests and router bindings.
 */
export async function listProjects(
  db: DbClient,
  options: ListProjectsOptions,
  cache: ICacheService = defaultCacheService,
) {
  const repo = new DrizzleProjectRepository(db);
  const service = new ProjectService(repo, cache);
  return service.listProjects(options);
}

export async function getProjectBySlug(
  db: DbClient,
  slug: string,
  locale: SupportedLocale,
  cache: ICacheService = defaultCacheService,
) {
  const repo = new DrizzleProjectRepository(db);
  const service = new ProjectService(repo, cache);
  return service.getProjectBySlug(slug, locale);
}
