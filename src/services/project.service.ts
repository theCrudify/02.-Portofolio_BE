import { asc, eq, isNull } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { paginate, publishedOnly } from '@/db/queries/common';
import * as schema from '@/db/schema';
import { notFound } from '@/lib/errors';
import { pickLocale, type SupportedLocale } from '@/lib/locale';
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

export async function listProjects(db: DbClient, options: ListProjectsOptions) {
  const { locale, technology, type } = options;
  const { page, limit, offset } = paginate({ page: options.page, limit: options.limit });

  const [allPublishedProjects, allPublishedTechs, projTechRows, projLinkRows, projMediaRows, mediaRows] =
    await Promise.all([
      db
        .select()
        .from(schema.projects)
        .where(publishedOnly(schema.projects))
        .orderBy(asc(schema.projects.sortOrder)),
      db.select().from(schema.technologies).where(publishedOnly(schema.technologies)),
      db.select().from(schema.projectTechnologies),
      db.select().from(schema.projectLinks),
      db.select().from(schema.projectMedia),
      db.select().from(schema.media).where(isNull(schema.media.deletedAt)),
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
    const matchingProjectIds = new Set(
      projTechRows.filter((pt) => pt.technologyId === filterTechId).map((pt) => pt.projectId),
    );
    filtered = filtered.filter((p) => matchingProjectIds.has(p.id));
  }

  const total = filtered.length;
  const pagedProjects = filtered.slice(offset, offset + limit);

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
}

export async function getProjectBySlug(db: DbClient, slug: string, locale: SupportedLocale) {
  const allPublished = await db
    .select()
    .from(schema.projects)
    .where(publishedOnly(schema.projects))
    .orderBy(asc(schema.projects.sortOrder));

  const index = allPublished.findIndex((p) => p.slug === slug);
  if (index === -1) {
    throw notFound(`Project '${slug}' not found`);
  }

  const project = allPublished[index]!;
  const prevRow = index > 0 ? allPublished[index - 1] : null;
  const nextRow = index < allPublished.length - 1 ? allPublished[index + 1] : null;

  const [projTechRows, projLinkRows, projMediaRows, techRows, mediaRows] = await Promise.all([
    db
      .select()
      .from(schema.projectTechnologies)
      .where(eq(schema.projectTechnologies.projectId, project.id)),
    db.select().from(schema.projectLinks).where(eq(schema.projectLinks.projectId, project.id)),
    db.select().from(schema.projectMedia).where(eq(schema.projectMedia.projectId, project.id)),
    db.select().from(schema.technologies).where(publishedOnly(schema.technologies)),
    db.select().from(schema.media).where(isNull(schema.media.deletedAt)),
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
    architectureMedia: project.architectureMediaId ? mediaMap.get(project.architectureMediaId) : null,
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
}
