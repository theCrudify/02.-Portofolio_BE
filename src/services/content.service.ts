import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import {
  auditLogs,
  profile,
  siteSettings,
  projectTechnologies,
  projectLinks,
  projectMedia,
  experienceTechnologies,
  projects,
  certifications,
  messages,
} from '../db/schema';
import { AppError } from '../lib/errors';
import { revalidate } from '../lib/revalidate';
import type { Env, AuthUser } from '../types/env';
import type { ResourceConfig } from './resource-registry';

export type ContentStatus = 'draft' | 'published' | 'archived';
export type TransitionAction = 'publish' | 'unpublish' | 'archive' | 'restore';
export type AuditActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'delete_permanent'
  | 'publish'
  | 'unpublish'
  | 'archive'
  | 'restore'
  | 'reorder'
  | 'login'
  | 'logout'
  | 'settings'
  | 'import';

const VALID_TRANSITIONS: Record<TransitionAction, { from: ContentStatus[]; to: ContentStatus }> = {
  publish: { from: ['draft'], to: 'published' },
  unpublish: { from: ['published'], to: 'draft' },
  archive: { from: ['draft', 'published'], to: 'archived' },
  restore: { from: ['archived'], to: 'draft' },
};

export async function writeAuditLog(
  db: Database,
  params: {
    userId: string | null;
    action: AuditActionType;
    resource: string;
    resourceId?: string | null;
    summary?: string | null;
  }
): Promise<void> {
  await db.insert(auditLogs).values({
    userId: params.userId,
    action: params.action,
    resource: params.resource.slice(0, 40),
    resourceId: params.resourceId ?? null,
    summary: params.summary ? params.summary.slice(0, 300) : null,
  });
}

export async function listResource(
  db: Database,
  config: ResourceConfig,
  query: {
    status?: ContentStatus;
    includeDeleted?: boolean;
    page?: number;
    limit?: number;
  }
) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 50));
  const offset = (page - 1) * limit;

  const conditions = [];
  if (!query.includeDeleted) {
    conditions.push(isNull(config.table.deletedAt));
  }
  if (query.status) {
    conditions.push(eq(config.table.status, query.status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(config.table)
      .where(whereClause)
      .orderBy(asc(config.table.sortOrder), desc(config.table.createdAt))
      .limit(limit)
      .offset(offset) as Promise<Record<string, unknown>[]>,
    db.$count(config.table, whereClause),
  ]);

  return {
    data: rows,
    meta: { page, limit, total },
  };
}

export async function getResourceById(
  db: Database,
  config: ResourceConfig,
  id: string
): Promise<Record<string, unknown>> {
  const rows = (await db
    .select()
    .from(config.table)
    .where(eq(config.table.id, id))
    .limit(1)) as Record<string, unknown>[];
  const row = rows[0];
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', `${config.name} item not found.`);
  }
  return row;
}

export async function createResource(
  db: Database,
  _env: Env,
  user: AuthUser,
  config: ResourceConfig,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (config.hasSlug && typeof payload.slug === 'string') {
    const existingRows = (await db
      .select()
      .from(config.table)
      .where(and(eq(config.table.slug, payload.slug), isNull(config.table.deletedAt)))
      .limit(1)) as Record<string, unknown>[];
    if (existingRows.length > 0) {
      throw new AppError(409, 'CONFLICT', `Slug "${payload.slug}" is already in use.`);
    }
  }

  const cleanPayload = { ...payload };
  delete cleanPayload.confirmSlugChange;
  if ('CompletedAt' in cleanPayload && !('completedAt' in cleanPayload)) {
    cleanPayload.completedAt = cleanPayload.CompletedAt;
  }
  delete cleanPayload.CompletedAt;

  const createdRows = (await db
    .insert(config.table)
    .values({
      ...cleanPayload,
      status: 'draft',
      publishedAt: null,
    })
    .returning()) as Record<string, unknown>[];

  const item = createdRows[0]!;
  await writeAuditLog(db, {
    userId: user.id,
    action: 'create',
    resource: config.name,
    resourceId: String(item.id),
    summary: `Created ${config.name}`,
  });

  return item;
}

export async function updateResource(
  db: Database,
  env: Env,
  user: AuthUser,
  config: ResourceConfig,
  id: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const existing = await getResourceById(db, config, id);

  if (user.role === 'editor' && existing.status !== 'draft') {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Editors can only edit items that are currently in draft status.'
    );
  }

  if (
    config.hasSlug &&
    typeof payload.slug === 'string' &&
    payload.slug !== existing.slug
  ) {
    if (existing.status === 'published' && !payload.confirmSlugChange) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Changing the slug of a published item requires confirmSlugChange: true.'
      );
    }
    const dupRows = (await db
      .select()
      .from(config.table)
      .where(and(eq(config.table.slug, payload.slug), isNull(config.table.deletedAt)))
      .limit(1)) as Record<string, unknown>[];
    if (dupRows[0] && dupRows[0].id !== id) {
      throw new AppError(409, 'CONFLICT', `Slug "${payload.slug}" is already in use.`);
    }
  }

  const cleanPayload = { ...payload };
  delete cleanPayload.confirmSlugChange;
  delete cleanPayload.status;
  delete cleanPayload.publishedAt;
  delete cleanPayload.deletedAt;
  if ('CompletedAt' in cleanPayload && !('completedAt' in cleanPayload)) {
    cleanPayload.completedAt = cleanPayload.CompletedAt;
  }
  delete cleanPayload.CompletedAt;

  const updatedRows = (await db
    .update(config.table)
    .set({
      ...cleanPayload,
      updatedAt: new Date(),
    })
    .where(eq(config.table.id, id))
    .returning()) as Record<string, unknown>[];

  const item = updatedRows[0]!;
  await writeAuditLog(db, {
    userId: user.id,
    action: 'update',
    resource: config.name,
    resourceId: id,
    summary: `Updated ${config.name}`,
  });

  if (item.status === 'published') {
    await revalidate(env, config.revalidateTags(item));
  }

  return item;
}

export async function transitionResource(
  db: Database,
  env: Env,
  user: AuthUser,
  config: ResourceConfig,
  id: string,
  action: TransitionAction
): Promise<Record<string, unknown>> {
  const existing = await getResourceById(db, config, id);
  if (existing.deletedAt) {
    throw new AppError(400, 'INVALID_STATE', 'Cannot transition a soft-deleted item.');
  }

  const currentStatus = existing.status as ContentStatus;
  const rule = VALID_TRANSITIONS[action];
  if (!rule.from.includes(currentStatus)) {
    throw new AppError(
      400,
      'INVALID_STATE',
      `Invalid status transition: cannot "${action}" an item in "${currentStatus}" status.`
    );
  }

  const nextStatus = rule.to;
  const now = new Date();
  const updatedRows = (await db
    .update(config.table)
    .set({
      status: nextStatus,
      publishedAt:
        action === 'publish'
          ? (existing.publishedAt ?? now)
          : existing.publishedAt,
      updatedAt: now,
    })
    .where(eq(config.table.id, id))
    .returning()) as Record<string, unknown>[];

  const item = updatedRows[0]!;
  await writeAuditLog(db, {
    userId: user.id,
    action,
    resource: config.name,
    resourceId: id,
    summary: `${currentStatus} -> ${nextStatus}`,
  });

  await revalidate(env, config.revalidateTags(item));
  return item;
}

export async function softDeleteResource(
  db: Database,
  env: Env,
  user: AuthUser,
  config: ResourceConfig,
  id: string
): Promise<void> {
  const existing = await getResourceById(db, config, id);
  if (user.role === 'editor' && existing.status !== 'draft') {
    throw new AppError(403, 'FORBIDDEN', 'Editors can only delete items that are in draft status.');
  }
  await db
    .update(config.table)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(config.table.id, id));

  await writeAuditLog(db, {
    userId: user.id,
    action: 'delete',
    resource: config.name,
    resourceId: id,
    summary: `Soft deleted ${config.name}`,
  });

  if (existing.status === 'published') {
    await revalidate(env, config.revalidateTags(existing));
  }
}

export async function deletePermanentResource(
  db: Database,
  _env: Env,
  user: AuthUser,
  config: ResourceConfig,
  id: string
): Promise<void> {
  const existing = await getResourceById(db, config, id);
  const isArchived = existing.status === 'archived';
  const isSoftDeleted = Boolean(existing.deletedAt);

  if (!isArchived && !isSoftDeleted) {
    throw new AppError(
      400,
      'INVALID_STATE',
      'Permanent deletion requires the item to be archived or soft-deleted first.'
    );
  }

  await db.delete(config.table).where(eq(config.table.id, id));
  await writeAuditLog(db, {
    userId: user.id,
    action: 'delete_permanent',
    resource: config.name,
    resourceId: id,
    summary: `Permanently deleted ${config.name}`,
  });
}

export async function reorderResource(
  db: Database,
  env: Env,
  user: AuthUser,
  config: ResourceConfig,
  ids: string[]
): Promise<void> {
  const now = new Date();
  // sort_order = index in the submitted list; batch runs as one transaction on neon-http
  const updates = ids.map((id, index) =>
    db.update(config.table).set({ sortOrder: index, updatedAt: now }).where(eq(config.table.id, id))
  );
  await db.batch(updates as [(typeof updates)[number], ...(typeof updates)[number][]]);

  await writeAuditLog(db, {
    userId: user.id,
    action: 'reorder',
    resource: config.name,
    summary: `Reordered ${ids.length} items`,
  });

  await revalidate(env, config.revalidateTags());
}

export async function getAdminProfile(db: Database) {
  const [row] = await db.select().from(profile).where(eq(profile.id, 1)).limit(1);
  return row ?? null;
}

export async function updateAdminProfile(
  db: Database,
  env: Env,
  user: AuthUser,
  payload: Record<string, unknown>
) {
  const now = new Date();
  const [updated] = await db
    .update(profile)
    .set({ ...payload, updatedAt: now })
    .where(eq(profile.id, 1))
    .returning();

  await writeAuditLog(db, {
    userId: user.id,
    action: 'update',
    resource: 'profile',
    resourceId: '1',
    summary: 'Updated profile',
  });

  await revalidate(env, ['site']);
  return updated;
}

export async function getAdminSiteSettings(db: Database) {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
  return row ?? null;
}

export async function updateAdminSiteSettings(
  db: Database,
  env: Env,
  user: AuthUser,
  payload: Record<string, unknown>
) {
  const now = new Date();
  const [updated] = await db
    .update(siteSettings)
    .set({ ...payload, updatedAt: now })
    .where(eq(siteSettings.id, 1))
    .returning();

  await writeAuditLog(db, {
    userId: user.id,
    action: 'settings',
    resource: 'site_settings',
    resourceId: '1',
    summary: 'Updated site settings',
  });

  await revalidate(env, ['site', 'projects', 'certifications']);
  return updated;
}

export async function replaceProjectTechnologies(
  db: Database,
  env: Env,
  user: AuthUser,
  projectId: string,
  items: { technologyId: string; isPrimary?: boolean; sortOrder?: number }[]
) {
  await db.delete(projectTechnologies).where(eq(projectTechnologies.projectId, projectId));
  if (items.length > 0) {
    await db.insert(projectTechnologies).values(
      items.map((item, idx) => ({
        projectId,
        technologyId: item.technologyId,
        isHighlight: item.isPrimary ?? false,
        sortOrder: item.sortOrder ?? idx,
      }))
    );
  }
  await writeAuditLog(db, {
    userId: user.id,
    action: 'update',
    resource: 'projects',
    resourceId: projectId,
    summary: `Replaced ${items.length} project technologies`,
  });
  await revalidate(env, ['site', 'projects']);
}

export async function replaceProjectLinks(
  db: Database,
  env: Env,
  user: AuthUser,
  projectId: string,
  items: {
    type?: 'demo' | 'repo_frontend' | 'repo_backend' | 'repo' | 'api_docs' | 'postman' | 'design' | 'video' | 'article' | 'other';
    linkType?: string;
    label?: string;
    labelEn?: string;
    url: string;
    isPrivate?: boolean;
    sortOrder?: number;
  }[]
) {
  await db.delete(projectLinks).where(eq(projectLinks.projectId, projectId));
  if (items.length > 0) {
    await db.insert(projectLinks).values(
      items.map((item, idx) => ({
        projectId,
        type: item.type ?? 'other',
        label: item.label ?? item.labelEn ?? 'Link',
        url: item.url,
        isPrivate: item.isPrivate ?? false,
        sortOrder: item.sortOrder ?? idx,
      }))
    );
  }
  await writeAuditLog(db, {
    userId: user.id,
    action: 'update',
    resource: 'projects',
    resourceId: projectId,
    summary: `Replaced ${items.length} project links`,
  });
  await revalidate(env, ['site', 'projects']);
}

export async function replaceProjectMedia(
  db: Database,
  env: Env,
  user: AuthUser,
  projectId: string,
  items: {
    mediaId: string;
    captionId?: string | null;
    captionEn?: string | null;
    role?: 'gallery' | 'demo_video' | 'clip';
    displayKind?: string;
    sortOrder?: number;
  }[]
) {

  await db.delete(projectMedia).where(eq(projectMedia.projectId, projectId));
  if (items.length > 0) {
    await db.insert(projectMedia).values(
      items.map((item, idx) => ({
        projectId,
        mediaId: item.mediaId,
        role: item.role ?? 'gallery',
        captionId: item.captionId ?? null,
        captionEn: item.captionEn ?? null,
        sortOrder: item.sortOrder ?? idx,
      }))
    );
  }
  await writeAuditLog(db, {
    userId: user.id,
    action: 'update',
    resource: 'projects',
    resourceId: projectId,
    summary: `Replaced ${items.length} project media`,
  });
  await revalidate(env, ['site', 'projects']);
}

export async function replaceExperienceTechnologies(
  db: Database,
  env: Env,
  user: AuthUser,
  experienceId: string,
  technologyIds: string[]
) {
  await db
    .delete(experienceTechnologies)
    .where(eq(experienceTechnologies.experienceId, experienceId));
  if (technologyIds.length > 0) {
    await db.insert(experienceTechnologies).values(
      technologyIds.map((technologyId) => ({
        experienceId,
        technologyId,
      }))
    );
  }
  await writeAuditLog(db, {
    userId: user.id,
    action: 'update',
    resource: 'experiences',
    resourceId: experienceId,
    summary: `Replaced ${technologyIds.length} experience technologies`,
  });
  await revalidate(env, ['site']);
}

export async function getAdminDashboardSummary(db: Database) {
  const allProjects = await db.select().from(projects).where(isNull(projects.deletedAt));
  const allCerts = await db.select().from(certifications).where(isNull(certifications.deletedAt));
  const allMessages = await db.select().from(messages);
  const recentLogs = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(10);

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const expiringCertifications = allCerts.filter(
    (c) => c.expiryDate && c.expiryDate >= todayStr && c.expiryDate <= in30Days
  );

  return {
    counts: {
      projectsPublished: allProjects.filter((p) => p.status === 'published').length,
      projectsDraft: allProjects.filter((p) => p.status === 'draft').length,
      unreadMessages: allMessages.filter((m) => !m.isRead && !m.isArchived).length,
    },
    expiringCertifications,
    recentAuditLogs: recentLogs,
    sqlCheck: Boolean(sql`1`),
  };
}
