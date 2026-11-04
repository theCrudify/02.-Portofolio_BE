import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import { AppError } from '@/lib/errors';
import { DeleteMediaRepository } from './delete.repository';

export class DeleteMediaService extends BaseService {
  protected override readonly repo: DeleteMediaRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new DeleteMediaRepository(db);
  }

  async execute(id: string, userId: string) {
    const usages = await this.repo.findUsages(id);
    if (usages.length > 0) {
      throw new AppError(
        409,
        'CONFLICT',
        'Cannot delete media asset because it is still referenced by active content.',
        usages.map((u) => ({ path: u.resource, message: `Referenced by ${u.resource} (${u.id})` })),
      );
    }

    if (!(await this.repo.softDelete(id))) {
      throw new AppError(404, 'NOT_FOUND', 'Media asset not found');
    }

    await this.repo.logAudit({
      userId,
      action: 'delete',
      resource: 'media',
      resourceId: id,
      summary: 'Soft-deleted media asset',
    });
  }
}
