import { and, asc, eq, inArray } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { publishedOnly } from '@/db/queries/common';
import { lk } from '@/db/queries/lookups';
import * as schema from '@/db/schema';
import { fetchContext, type RawContext } from './context.repository';
import { BaseRepository } from './base.repository';

type Row<T extends { $inferSelect: unknown }> = T['$inferSelect'];

export interface ProjectDetailRelations {
  projTechRows: Row<typeof schema.projectTechnologies>[];
  projLinkRows: Row<typeof schema.projectLinks>[];
  projMediaRows: Row<typeof schema.projectMedia>[];
  metricRows: Row<typeof schema.projectMetrics>[];
  highlightRows: Row<typeof schema.projectHighlights>[];
  responsibilityRows: Row<typeof schema.projectResponsibilities>[];
  positionRows: Row<typeof schema.experiences>[];
  techRows: Row<typeof schema.technologies>[];
}

export interface IProjectRepository {
  fetchContext(): Promise<RawContext>;
  findPublishedProjects(): Promise<Row<typeof schema.projects>[]>;
  findPublishedTechnologies(): Promise<Row<typeof schema.technologies>[]>;
  findProjectRelations(projectIds: string[]): Promise<{
    projTechRows: Row<typeof schema.projectTechnologies>[];
    projLinkRows: Row<typeof schema.projectLinks>[];
    projClipRows: Row<typeof schema.projectMedia>[];
  }>;
  findProjectDetailRelations(projectId: string): Promise<ProjectDetailRelations>;
}

export class DrizzleProjectRepository extends BaseRepository implements IProjectRepository {
  constructor(db: DbClient) {
    super(db);
  }

  fetchContext(): Promise<RawContext> {
    return fetchContext(this.db);
  }

  async findPublishedProjects() {
    return this.db
      .select()
      .from(schema.projects)
      .where(publishedOnly(schema.projects))
      .orderBy(asc(schema.projects.sortOrder));
  }

  async findPublishedTechnologies() {
    return this.db.select().from(schema.technologies).where(publishedOnly(schema.technologies));
  }

  async findProjectRelations(projectIds: string[]) {
    if (projectIds.length === 0) {
      return { projTechRows: [], projLinkRows: [], projClipRows: [] };
    }
    const [projTechRows, projLinkRows, projClipRows] = await Promise.all([
      this.db
        .select()
        .from(schema.projectTechnologies)
        .where(inArray(schema.projectTechnologies.projectId, projectIds)),
      this.db.select().from(schema.projectLinks).where(inArray(schema.projectLinks.projectId, projectIds)),
      this.db
        .select()
        .from(schema.projectMedia)
        .where(
          and(
            inArray(schema.projectMedia.projectId, projectIds),
            eq(schema.projectMedia.roleId, lk('project_media_role', 'clip')),
          ),
        ),
    ]);
    return { projTechRows, projLinkRows, projClipRows };
  }

  async findProjectDetailRelations(projectId: string): Promise<ProjectDetailRelations> {
    const byProject = <T extends { projectId: unknown }>(t: T) => eq(t.projectId as never, projectId);
    const [
      projTechRows,
      projLinkRows,
      projMediaRows,
      metricRows,
      highlightRows,
      responsibilityRows,
      positionRows,
      techRows,
    ] = await Promise.all([
      this.db.select().from(schema.projectTechnologies).where(byProject(schema.projectTechnologies)),
      this.db.select().from(schema.projectLinks).where(byProject(schema.projectLinks)),
      this.db.select().from(schema.projectMedia).where(byProject(schema.projectMedia)),
      this.db.select().from(schema.projectMetrics).where(byProject(schema.projectMetrics)),
      this.db.select().from(schema.projectHighlights).where(byProject(schema.projectHighlights)),
      this.db.select().from(schema.projectResponsibilities).where(byProject(schema.projectResponsibilities)),
      // Published positions this project belongs to.
      this.db
        .select({ experience: schema.experiences })
        .from(schema.experienceProjects)
        .innerJoin(schema.experiences, eq(schema.experiences.id, schema.experienceProjects.experienceId))
        .where(and(eq(schema.experienceProjects.projectId, projectId), publishedOnly(schema.experiences)))
        .then((rows) => rows.map((r) => r.experience)),
      this.db.select().from(schema.technologies).where(publishedOnly(schema.technologies)),
    ]);
    return {
      projTechRows,
      projLinkRows,
      projMediaRows,
      metricRows,
      highlightRows,
      responsibilityRows,
      positionRows,
      techRows,
    };
  }
}
