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
import { toContext } from '@/repositories/context.repository';
import { toProjectCard, toProjectDetail, type TechnologyRow } from '@/services/serializers';

export interface ListProjectsOptions {
  locale: SupportedLocale;
  technology?: string;
  /** project_type lookup code */
  type?: string;
  page?: number;
  limit?: number;
}

/**
 * ProjectService: published projects and case-study details, cached by tag.
 */
export class ProjectService {
  constructor(
    private readonly projectRepo: IProjectRepository,
    private readonly cache: ICacheService = defaultCacheService,
  ) {}

  /** Published projects, paginated, filtered by technology slug and/or type code (tag 'projects', 180s). */
  async listProjects(options: ListProjectsOptions) {
    const { locale, technology, type } = options;
    const { page, limit, offset } = paginate({ page: options.page, limit: options.limit });
    const cacheKey = `projects:list:v2:${locale}:${type ?? 'all'}:${technology ?? 'all'}:${page}:${limit}`;

    return this.cache.remember(
      cacheKey,
      180,
      async () => {
        const [allProjects, allTechs, rawContext] = await Promise.all([
          this.projectRepo.findPublishedProjects(),
          this.projectRepo.findPublishedTechnologies(),
          this.projectRepo.fetchContext(),
        ]);
        const ctx = toContext(rawContext, locale);
        const techMap = new Map<string, TechnologyRow>(allTechs.map((t) => [t.id, t]));

        let filtered = allProjects;
        if (type) {
          const typeId = ctx.lookups.idOf('project_type', type);
          filtered = filtered.filter((p) => p.typeId === typeId);
        }
        if (technology) {
          const filterTechId = allTechs.find((t) => t.slug === technology)?.id;
          if (!filterTechId) {
            return { items: [], meta: { page, limit, total: 0 } };
          }
          const { projTechRows } = await this.projectRepo.findProjectRelations(filtered.map((p) => p.id));
          const matching = new Set(
            projTechRows.filter((pt) => pt.technologyId === filterTechId).map((pt) => pt.projectId),
          );
          filtered = filtered.filter((p) => matching.has(p.id));
        }

        const total = filtered.length;
        const paged = filtered.slice(offset, offset + limit);
        if (paged.length === 0) {
          return { items: [], meta: { page, limit, total } };
        }

        const { projTechRows, projLinkRows, projClipRows } = await this.projectRepo.findProjectRelations(
          paged.map((p) => p.id),
        );

        const items = paged.map((proj) => {
          const techs = projTechRows
            .filter((pt) => pt.projectId === proj.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .flatMap((pt) => techMap.get(pt.technologyId) ?? []);
          const clip = projClipRows
            .filter((pm) => pm.projectId === proj.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)[0];
          return toProjectCard(
            proj,
            ctx,
            techs,
            projLinkRows.filter((pl) => pl.projectId === proj.id),
            clip?.mediaId ?? null,
          );
        });

        return { items, meta: { page, limit, total } };
      },
      ['projects'],
    );
  }

  /** Published project detail by slug with prev/next navigation (tag 'projects', 300s). */
  async getProjectBySlug(slug: string, locale: SupportedLocale) {
    const cacheKey = `project:slug:v2:${slug}:${locale}`;

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
        const ref = (row: (typeof allPublished)[number] | undefined) =>
          row ? { slug: row.slug, title: pickLocale(row, 'title', locale) ?? row.titleEn } : null;

        const [rel, rawContext] = await Promise.all([
          this.projectRepo.findProjectDetailRelations(project.id),
          this.projectRepo.fetchContext(),
        ]);
        const techMap = new Map<string, TechnologyRow>(rel.techRows.map((t) => [t.id, t]));

        return toProjectDetail(project, toContext(rawContext, locale), {
          technologies: rel.projTechRows.flatMap((pt) => {
            const tech = techMap.get(pt.technologyId);
            return tech ? [{ tech, groupId: pt.groupId, sortOrder: pt.sortOrder }] : [];
          }),
          links: rel.projLinkRows,
          mediaItems: rel.projMediaRows,
          metrics: rel.metricRows,
          highlights: rel.highlightRows,
          responsibilities: rel.responsibilityRows,
          positions: rel.positionRows,
          prev: ref(allPublished[index - 1]),
          next: ref(allPublished[index + 1]),
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
