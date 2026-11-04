import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import type { Locale } from '@/lib/locale';
import type { ListPublicCertificationsQueryDto } from './list-certifications.dto';
import { ListPublicCertificationsRepository } from './list-certifications.repository';

export class ListPublicCertificationsService extends BaseService {
  protected override readonly repo: ListPublicCertificationsRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new ListPublicCertificationsRepository(db);
  }

  async execute(locale: Locale, query: ListPublicCertificationsQueryDto) {
    return this.repo.list(locale, query);
  }
}
