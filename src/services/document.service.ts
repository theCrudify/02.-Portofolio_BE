import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { Database } from '../db/client';
import { assertLookupCodes, lk, loadLookups, type LookupIndex } from '../db/queries/lookups';
import {
  documents,
  events,
  exportPresetSections,
  exportPresets,
  exportPresetTechnologies,
  media,
  shareLinks,
} from '../db/schema';
import type { ExportPresetRow } from './export.service';

async function getMediaById(db: Database, id: string) {
  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  return row ?? null;
}

/* ---------- documents ---------- */

type DocumentRow = typeof documents.$inferSelect;

/** Adds the type/locale codes next to their lookup ids. */
function withDocumentCodes(lookups: LookupIndex, row: DocumentRow) {
  return { ...row, type: lookups.code(row.typeId) ?? '', locale: lookups.code(row.localeId) ?? '' };
}

export async function listDocuments(db: Database) {
  const [rows, lookups] = await Promise.all([
    db.select().from(documents).orderBy(desc(documents.createdAt)),
    loadLookups(db),
  ]);
  return rows.map((r) => withDocumentCodes(lookups, r));
}

export interface DocumentInput {
  mediaId: string;
  type: string; // document_type code
  locale: string; // locale code
  title: string;
  version: number;
  pageCount?: number | null;
  notes?: string | null;
}

export async function createDocument(db: Database, input: DocumentInput) {
  const [created] = await db
    .insert(documents)
    .values({
      mediaId: input.mediaId,
      typeId: lk('document_type', input.type),
      localeId: lk('locale', input.locale),
      title: input.title,
      version: input.version,
      pageCount: input.pageCount ?? null,
      notes: input.notes ?? null,
      isActive: false,
    })
    .returning();
  return withDocumentCodes(await loadLookups(db), created!);
}

// Only one active document per type + locale; both updates run in one batch so there is never a gap.
export async function activateDocument(db: Database, id: string) {
  const [target] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!target) return null;
  const now = new Date();
  const [, activated] = await db.batch([
    db
      .update(documents)
      .set({ isActive: false, updatedAt: now })
      .where(
        and(eq(documents.typeId, target.typeId), eq(documents.localeId, target.localeId), ne(documents.id, id)),
      ),
    db.update(documents).set({ isActive: true, updatedAt: now }).where(eq(documents.id, id)).returning(),
  ]);
  const lookups = await loadLookups(db);
  return {
    target: withDocumentCodes(lookups, target),
    activated: withDocumentCodes(lookups, activated[0] ?? target),
  };
}

export async function deleteDocument(db: Database, id: string) {
  const [deleted] = await db.delete(documents).where(eq(documents.id, id)).returning();
  return deleted ?? null;
}

export async function getActiveDocument(db: Database, type: string, locale: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.typeId, lk('document_type', type)),
        eq(documents.localeId, lk('locale', locale)),
        eq(documents.isActive, true),
      ),
    )
    .limit(1);
  if (!doc) return null;
  return { doc: withDocumentCodes(await loadLookups(db), doc), asset: await getMediaById(db, doc.mediaId) };
}

/* ---------- export presets ---------- */

export interface PresetInput {
  slug: string;
  name: string;
  template: string; // export_template code
  locale: string; // locale code
  featuredOnly: boolean;
  sinceYears: number | null;
  isPublic: boolean;
  sortOrder: number;
  sections: { key: string; limit?: number | null }[]; // key = site_section code
  technologyIds: string[];
}

export async function assertPresetCodes(
  db: Database,
  input: Pick<PresetInput, 'template' | 'locale' | 'sections'>,
): Promise<void> {
  await assertLookupCodes(db, {
    template: ['export_template', input.template],
    locale: ['locale', input.locale],
    ...Object.fromEntries(
      input.sections.map((sec, i) => [`sections.${i}.key`, ['site_section', sec.key] as const]),
    ),
  });
}

function presetValues(input: PresetInput) {
  return {
    slug: input.slug,
    name: input.name,
    templateId: lk('export_template', input.template),
    localeId: lk('locale', input.locale),
    featuredOnly: input.featuredOnly,
    sinceYears: input.sinceYears,
    isPublic: input.isPublic,
    sortOrder: input.sortOrder,
  };
}

/** Replace a preset's section and technology rows in one atomic batch. */
async function replacePresetChildren(db: Database, presetId: string, input: PresetInput) {
  const statements: BatchItem<'pg'>[] = [
    db.delete(exportPresetSections).where(eq(exportPresetSections.presetId, presetId)),
    db.delete(exportPresetTechnologies).where(eq(exportPresetTechnologies.presetId, presetId)),
  ];
  if (input.sections.length > 0) {
    statements.push(
      db.insert(exportPresetSections).values(
        input.sections.map((sec, i) => ({
          presetId,
          sectionId: lk('site_section', sec.key),
          itemLimit: sec.limit ?? null,
          sortOrder: i,
        })),
      ),
    );
  }
  if (input.technologyIds.length > 0) {
    statements.push(
      db
        .insert(exportPresetTechnologies)
        .values(input.technologyIds.map((technologyId) => ({ presetId, technologyId }))),
    );
  }
  await db.batch(statements as [BatchItem<'pg'>, ...BatchItem<'pg'>[]]);
}

type PresetRow = typeof exportPresets.$inferSelect;

/** Presets with their child rows resolved to codes. */
export async function hydratePresets(db: Database, rows: PresetRow[]): Promise<ExportPresetRow[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [sections, techs, lookups] = await Promise.all([
    db
      .select()
      .from(exportPresetSections)
      .where(inArray(exportPresetSections.presetId, ids))
      .orderBy(asc(exportPresetSections.sortOrder)),
    db.select().from(exportPresetTechnologies).where(inArray(exportPresetTechnologies.presetId, ids)),
    loadLookups(db),
  ]);
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    template: lookups.code(r.templateId) ?? 'full',
    locale: lookups.code(r.localeId) ?? 'en',
    featuredOnly: r.featuredOnly,
    sinceYears: r.sinceYears ?? null,
    isPublic: r.isPublic,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    sections: sections
      .filter((s) => s.presetId === r.id)
      .flatMap((s) => {
        const key = lookups.code(s.sectionId);
        return key ? [{ key, limit: s.itemLimit ?? null }] : [];
      }),
    technologyIds: techs.filter((t) => t.presetId === r.id).map((t) => t.technologyId),
  }));
}

export async function listExportPresets(db: Database) {
  return hydratePresets(db, await db.select().from(exportPresets).orderBy(desc(exportPresets.createdAt)));
}

export async function createExportPreset(db: Database, input: PresetInput) {
  const [created] = await db.insert(exportPresets).values(presetValues(input)).returning();
  await replacePresetChildren(db, created!.id, input);
  return (await hydratePresets(db, [created!]))[0]!;
}

export async function updateExportPreset(db: Database, id: string, input: PresetInput) {
  const [updated] = await db
    .update(exportPresets)
    .set({ ...presetValues(input), updatedAt: new Date() })
    .where(eq(exportPresets.id, id))
    .returning();
  if (!updated) return null;
  await replacePresetChildren(db, id, input);
  return (await hydratePresets(db, [updated]))[0]!;
}

export async function deleteExportPreset(db: Database, id: string) {
  const [deleted] = await db
    .delete(exportPresets)
    .where(eq(exportPresets.id, id))
    .returning({ id: exportPresets.id });
  return Boolean(deleted);
}

export async function getPresetBySlug(db: Database, slug: string) {
  const rows = await db.select().from(exportPresets).where(eq(exportPresets.slug, slug)).limit(1);
  return (await hydratePresets(db, rows))[0] ?? null;
}

export async function getPresetById(db: Database, id: string) {
  const rows = await db.select().from(exportPresets).where(eq(exportPresets.id, id)).limit(1);
  return (await hydratePresets(db, rows))[0] ?? null;
}

/* ---------- share links ---------- */

export function generateShareToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function listShareLinks(db: Database) {
  return db.select().from(shareLinks).orderBy(desc(shareLinks.createdAt));
}

export async function createShareLink(
  db: Database,
  values: Omit<typeof shareLinks.$inferInsert, 'token' | 'isActive' | 'viewCount'>,
) {
  const [created] = await db
    .insert(shareLinks)
    .values({ ...values, token: generateShareToken(), isActive: true, viewCount: 0 })
    .returning();
  return created!;
}

export async function updateShareLink(
  db: Database,
  id: string,
  patch: { label?: string; isActive?: boolean; expiresAt?: Date | null },
) {
  const [updated] = await db
    .update(shareLinks)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(shareLinks.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteShareLink(db: Database, id: string) {
  const [deleted] = await db
    .delete(shareLinks)
    .where(eq(shareLinks.id, id))
    .returning({ id: shareLinks.id });
  return Boolean(deleted);
}

export async function getShareLinkByToken(db: Database, token: string) {
  const [link] = await db.select().from(shareLinks).where(eq(shareLinks.token, token)).limit(1);
  return link ?? null;
}

// Atomic increment in SQL so concurrent opens are all counted.
export async function recordShareOpen(db: Database, linkId: string, token: string, visitorHash: string) {
  const now = new Date();
  await db.batch([
    db
      .update(shareLinks)
      .set({ viewCount: sql`${shareLinks.viewCount} + 1`, lastOpenedAt: now, updatedAt: now })
      .where(eq(shareLinks.id, linkId)),
    db.insert(events).values({
      typeId: lk('event_type', 'share_open'),
      path: `/s/${token}`,
      shareLinkId: linkId,
      visitorHash,
    }),
  ]);
}

export async function getDocumentWithMedia(db: Database, id: string) {
  const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!doc) return null;
  return { ...doc, media: await getMediaById(db, doc.mediaId) };
}
