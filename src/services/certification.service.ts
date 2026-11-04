import type { DbClient } from '@/db/client';
import { defaultCacheService } from '@/core/cache/memory-cache.service';
import type { ICacheService } from '@/core/cache/cache.interface';
import type { SupportedLocale } from '@/lib/locale';
import {
  DrizzleCertificationRepository,
  type ICertificationRepository,
} from '@/repositories/certification.repository';
import { toCertification, type MediaRow } from '@/services/serializers';

export interface ListCertificationsOptions {
  locale: SupportedLocale;
  type?: 'certification' | 'course' | 'bootcamp' | 'training';
}

/**
 * CertificationService: OOP service managing certifications, courses, and bootcamps
 * with automatic tag-based caching.
 */
export class CertificationService {
  constructor(
    private readonly certRepo: ICertificationRepository,
    private readonly cache: ICacheService = defaultCacheService,
  ) {}

  /**
   * List published certifications with optional type filtering and 300s edge caching.
   */
  async listCertifications(options: ListCertificationsOptions) {
    const { locale, type } = options;
    const cacheKey = `certifications:list:${locale}:${type ?? 'all'}`;

    return this.cache.remember(
      cacheKey,
      300,
      async () => {
        const [certRows, mediaRows] = await Promise.all([
          this.certRepo.findPublishedCertifications(),
          this.certRepo.findActiveMedia(),
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
      },
      ['certifications'],
    );
  }

  async invalidateCache(): Promise<void> {
    await this.cache.invalidateTag('certifications');
  }
}

/**
 * Functional adapter preserving backward compatibility with existing tests and router bindings.
 */
export async function listCertifications(
  db: DbClient,
  options: ListCertificationsOptions,
  cache: ICacheService = defaultCacheService,
) {
  const repo = new DrizzleCertificationRepository(db);
  const service = new CertificationService(repo, cache);
  return service.listCertifications(options);
}
