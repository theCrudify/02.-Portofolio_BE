import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { publishedOnly } from '@/db/queries/common';
import * as schema from '@/db/schema';
import { BaseRepository } from './base.repository';

export interface IProjectRepository {
  findPublishedProjects(): Promise<(typeof schema.projects.$inferSelect)[]>;
  findPublishedTechnologies(): Promise<(typeof schema.technologies.$inferSelect)[]>;
  findProjectRelations(projectIds: string[]): Promise<{
    projTechRows: (typeof schema.projectTechnologies.$inferSelect)[];
    projLinkRows: (typeof schema.projectLinks.$inferSelect)[];
    projMediaRows: (typeof schema.projectMedia.$inferSelect)[];
  }>;
  findProjectDetailRelations(projectId: string): Promise<{
    projTechRows: (typeof schema.projectTechnologies.$inferSelect)[];
    projLinkRows: (typeof schema.projectLinks.$inferSelect)[];
    projMediaRows: (typeof schema.projectMedia.$inferSelect)[];
    techRows: (typeof schema.technologies.$inferSelect)[];
  }>;
  loadMedia(ids: (string | null | undefined)[]): Promise<(typeof schema.media.$inferSelect)[]>;
}

export class DrizzleProjectRepository extends BaseRepository implements IProjectRepository {
  constructor(db: DbClient) {
    super(db);
  }

  async findPublishedProjects(): Promise<(typeof schema.projects.$inferSelect)[]> {
    return this.db
      .select()
      .from(schema.projects)
      .where(publishedOnly(schema.projects))
      .orderBy(asc(schema.projects.sortOrder));
  }

  async findPublishedTechnologies(): Promise<(typeof schema.technologies.$inferSelect)[]> {
    return this.db
      .select()
      .from(schema.technologies)
      .where(publishedOnly(schema.technologies));
  }

  async findProjectRelations(projectIds: string[]) {
    if (projectIds.length === 0) {
      return { projTechRows: [], projLinkRows: [], projMediaRows: [] };
    }

    const [projTechRows, projLinkRows, projMediaRows] = await Promise.all([
      this.db
        .select()
        .from(schema.projectTechnologies)
        .where(inArray(schema.projectTechnologies.projectId, projectIds)),
      this.db
        .select()
        .from(schema.projectLinks)
        .where(inArray(schema.projectLinks.projectId, projectIds)),
      this.db
        .select()
        .from(schema.projectMedia)
        .where(
          and(
            inArray(schema.projectMedia.projectId, projectIds),
            eq(schema.projectMedia.role, 'clip'),
          ),
        ),
    ]);

    return { projTechRows, projLinkRows, projMediaRows };
  }

  async findProjectDetailRelations(projectId: string) {
    const [projTechRows, projLinkRows, projMediaRows, techRows] = await Promise.all([
      this.db
        .select()
        .from(schema.projectTechnologies)
        .where(eq(schema.projectTechnologies.projectId, projectId)),
      this.db
        .select()
        .from(schema.projectLinks)
        .where(eq(schema.projectLinks.projectId, projectId)),
      this.db
        .select()
        .from(schema.projectMedia)
        .where(eq(schema.projectMedia.projectId, projectId)),
      this.db
        .select()
        .from(schema.technologies)
        .where(publishedOnly(schema.technologies)),
    ]);

    return { projTechRows, projLinkRows, projMediaRows, techRows };
  }

  async loadMedia(ids: (string | null | undefined)[]) {
    const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    if (unique.length === 0) return [];
    return this.db
      .select()
      .from(schema.media)
      .where(and(inArray(schema.media.id, unique), isNull(schema.media.deletedAt)));
  }
}

