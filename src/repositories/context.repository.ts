import { isNull } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { loadLookups } from '@/db/queries/lookups';
import * as schema from '@/db/schema';
import type { SupportedLocale } from '@/lib/locale';
import type { MediaRow, OrganizationRow, SerializeContext } from '@/services/serializers';

/** Raw reference data every public payload needs (all small tables). */
export interface RawContext {
  lookups: Awaited<ReturnType<typeof loadLookups>>;
  mediaRows: MediaRow[];
  organizationRows: OrganizationRow[];
}

export async function fetchContext(db: DbClient): Promise<RawContext> {
  const [lookups, mediaRows, organizationRows] = await Promise.all([
    loadLookups(db),
    db.select().from(schema.media).where(isNull(schema.media.deletedAt)),
    db.select().from(schema.organizations).where(isNull(schema.organizations.deletedAt)),
  ]);
  return { lookups, mediaRows, organizationRows };
}

export function toContext(raw: RawContext, locale: SupportedLocale): SerializeContext {
  return {
    locale,
    lookups: raw.lookups,
    media: new Map(raw.mediaRows.map((m) => [m.id, m])),
    organizations: new Map(raw.organizationRows.map((o) => [o.id, o])),
  };
}
