import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import { AppError } from '@/lib/errors';
import { revalidate } from '@/lib/revalidate';
import type { Env } from '@/types/env';
import { DeleteDocumentsRepository } from './delete.repository';

export class DeleteDocumentsService extends BaseService {
  protected override readonly repo: DeleteDocumentsRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new DeleteDocumentsRepository(db);
  }

  async deleteDoc(id: string, userId: string, env: Env) {
    const deleted = await this.repo.deleteDocument(id);
    if (!deleted) {
      throw new AppError(404, 'NOT_FOUND', 'Document not found');
    }

    await this.repo.logAudit({
      userId,
      action: 'delete',
      resource: 'documents',
      resourceId: id,
      summary: 'Deleted document record',
    });

    if (deleted.isActive) {
      await revalidate(env, ['site', 'documents']);
    }
  }

  async deletePreset(id: string, userId: string) {
    if (!(await this.repo.deletePreset(id))) {
      throw new AppError(404, 'NOT_FOUND', 'Export preset not found');
    }

    await this.repo.logAudit({
      userId,
      action: 'delete',
      resource: 'export_presets',
      resourceId: id,
      summary: 'Deleted export preset',
    });
  }

  async deleteShareLink(id: string, userId: string) {
    if (!(await this.repo.deleteShareLink(id))) {
      throw new AppError(404, 'NOT_FOUND', 'Share link not found');
    }

    await this.repo.logAudit({
      userId,
      action: 'delete',
      resource: 'share_links',
      resourceId: id,
      summary: 'Deleted share link',
    });
  }
}
