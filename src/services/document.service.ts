import { and, desc, eq, ne, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { documents, events, exportPresets, media, shareLinks } from '../db/schema';

type DocumentType = 'cv' | 'portfolio_pdf' | 'other';
type Locale = 'en' | 'id';
type PresetValues = Omit<typeof exportPresets.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>;

async function getMediaById(db: Database, id: string) {
  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  return row ?? null;
}

/* ---------- documents ---------- */

export function listDocuments(db: Database) {
  return db.select().from(documents).orderBy(desc(documents.createdAt));
}

export async function createDocument(db: Database, values: typeof documents.$inferInsert) {
  const [created] = await db
    .insert(documents)
    .values({ ...values, isActive: false })
    .returning();
  return created!;
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
        and(eq(documents.type, target.type), eq(documents.locale, target.locale), ne(documents.id, id)),
      ),
    db.update(documents).set({ isActive: true, updatedAt: now }).where(eq(documents.id, id)).returning(),
  ]);
  return { target, activated: activated[0] ?? target };
}

export async function deleteDocument(db: Database, id: string) {
  const [deleted] = await db.delete(documents).where(eq(documents.id, id)).returning();
  return deleted ?? null;
}

export async function getActiveDocument(db: Database, type: DocumentType, locale: Locale) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.type, type), eq(documents.locale, locale), eq(documents.isActive, true)))
    .limit(1);
  if (!doc) return null;
  return { doc, asset: await getMediaById(db, doc.mediaId) };
}

/* ---------- export presets ---------- */

export function listExportPresets(db: Database) {
  return db.select().from(exportPresets).orderBy(desc(exportPresets.createdAt));
}

export async function createExportPreset(db: Database, values: PresetValues) {
  const [created] = await db.insert(exportPresets).values(values).returning();
  return created!;
}

export async function updateExportPreset(db: Database, id: string, values: PresetValues) {
  const [updated] = await db
    .update(exportPresets)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(exportPresets.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteExportPreset(db: Database, id: string) {
  const [deleted] = await db
    .delete(exportPresets)
    .where(eq(exportPresets.id, id))
    .returning({ id: exportPresets.id });
  return Boolean(deleted);
}

export async function getPresetBySlug(db: Database, slug: string) {
  const [preset] = await db.select().from(exportPresets).where(eq(exportPresets.slug, slug)).limit(1);
  return preset ?? null;
}

export async function getPresetById(db: Database, id: string) {
  const [preset] = await db.select().from(exportPresets).where(eq(exportPresets.id, id)).limit(1);
  return preset ?? null;
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
    db.insert(events).values({ type: 'share_open', path: `/s/${token}`, shareLinkId: linkId, visitorHash }),
  ]);
}

export async function getDocumentWithMedia(db: Database, id: string) {
  const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!doc) return null;
  return { ...doc, media: await getMediaById(db, doc.mediaId) };
}
