import { asc } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { publishedOnly } from '@/db/queries/common';
import * as schema from '@/db/schema';
import { fetchContext, type RawContext } from './context.repository';
import { fetchExtras, type RawExtras } from './extras.repository';
import { BaseRepository } from './base.repository';

export interface ICertificationRepository {
  findPublishedCertifications(): Promise<(typeof schema.certifications.$inferSelect)[]>;
  fetchContext(): Promise<RawContext>;
  fetchExtras(ids: string[]): Promise<RawExtras>;
}

export class DrizzleCertificationRepository
  extends BaseRepository
  implements ICertificationRepository
{
  constructor(db: DbClient) {
    super(db);
  }

  async findPublishedCertifications(): Promise<(typeof schema.certifications.$inferSelect)[]> {
    return this.db
      .select()
      .from(schema.certifications)
      .where(publishedOnly(schema.certifications))
      .orderBy(asc(schema.certifications.sortOrder));
  }

  fetchContext(): Promise<RawContext> {
    return fetchContext(this.db);
  }

  fetchExtras(ids: string[]): Promise<RawExtras> {
    return fetchExtras(this.db, 'certification', ids);
  }
}

