import { asc, isNull } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { publishedOnly } from '@/db/queries/common';
import * as schema from '@/db/schema';
import { BaseRepository } from './base.repository';

export interface ICertificationRepository {
  findPublishedCertifications(): Promise<(typeof schema.certifications.$inferSelect)[]>;
  findActiveMedia(): Promise<(typeof schema.media.$inferSelect)[]>;
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

  async findActiveMedia(): Promise<(typeof schema.media.$inferSelect)[]> {
    return this.db.select().from(schema.media).where(isNull(schema.media.deletedAt));
  }
}

