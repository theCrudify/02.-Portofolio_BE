import { asc, isNull } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { publishedOnly } from '@/db/queries/common';
import * as schema from '@/db/schema';
import type { SupportedLocale } from '@/lib/locale';
import { toCertification, type MediaRow } from '@/services/serializers';

export interface ListCertificationsOptions {
  locale: SupportedLocale;
  type?: 'certification' | 'course' | 'bootcamp' | 'training';
}

export async function listCertifications(db: DbClient, options: ListCertificationsOptions) {
  const { locale, type } = options;

  const [certRows, mediaRows] = await Promise.all([
    db
      .select()
      .from(schema.certifications)
      .where(publishedOnly(schema.certifications))
      .orderBy(asc(schema.certifications.sortOrder)),
    db.select().from(schema.media).where(isNull(schema.media.deletedAt)),
  ]);

  const mediaMap = new Map<string, MediaRow>();
  for (const m of mediaRows) {
    mediaMap.set(m.id, m);
  }

  const filtered = type ? certRows.filter((c) => c.type === type) : certRows;

  return filtered.map((cert) => {
    const issuerMedia = cert.issuerMediaId ? mediaMap.get(cert.issuerMediaId) : null;
    const imageMedia = cert.imageMediaId ? mediaMap.get(cert.imageMediaId) : null;
    return toCertification(cert, issuerMedia, imageMedia, locale);
  });
}
