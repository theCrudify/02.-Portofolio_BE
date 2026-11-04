import type { DbClient } from '@/db/client';
import { defaultCacheService } from '@/core/cache/memory-cache.service';
import type { ICacheService } from '@/core/cache/cache.interface';
import type { SupportedLocale } from '@/lib/locale';
import {
  DrizzleCertificationRepository,
  type ICertificationRepository,
} from '@/repositories/certification.repository';
import { toContext } from '@/repositories/context.repository';
import { toCertification } from '@/services/serializers';

export interface ListCertificationsOptions {
  locale: SupportedLocale;
  /** cert_type lookup code */
  type?: string;
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
    const cacheKey = `certifications:list:v2:${locale}:${type ?? 'all'}`;

    return this.cache.remember(
      cacheKey,
      300,
      async () => {
        const [certRows, rawContext] = await Promise.all([
          this.certRepo.findPublishedCertifications(),
          this.certRepo.fetchContext(),
        ]);
        const ctx = toContext(rawContext, locale);
        const typeId = type ? ctx.lookups.idOf('cert_type', type) : null;
        const filtered = type ? certRows.filter((c) => c.typeId === typeId) : certRows;
        return filtered.map((cert) => toCertification(cert, ctx));
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
