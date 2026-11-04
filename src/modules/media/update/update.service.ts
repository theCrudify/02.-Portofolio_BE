import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import { AppError } from '@/lib/errors';
import { revalidate } from '@/lib/revalidate';
import type { Env } from '@/types/env';
import type { UpdateMediaBodyDto } from './update.dto';
import { UpdateMediaRepository } from './update.repository';

export class UpdateMediaService extends BaseService {
  protected override readonly repo: UpdateMediaRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new UpdateMediaRepository(db);
  }

  async execute(id: string, dto: UpdateMediaBodyDto, userId: string, env: Env) {
    const updated = await this.repo.updateById(id, dto);
    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', 'Media asset not found');
    }

    await this.repo.logAudit({
      userId,
      action: 'update',
      resource: 'media',
      resourceId: id,
      summary: 'Updated media metadata',
    });

    await revalidate(env, ['site', 'projects', 'certifications']);
    return updated;
  }
}
