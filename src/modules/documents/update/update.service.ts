import { assertPresetCodes } from '@/services/document.service';
import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import { AppError } from '@/lib/errors';
import { revalidate } from '@/lib/revalidate';
import type { Env } from '@/types/env';
import type { UpdateExportPresetBodyDto, UpdateShareLinkBodyDto } from './update.dto';
import { UpdateDocumentsRepository } from './update.repository';

export class UpdateDocumentsService extends BaseService {
  protected override readonly repo: UpdateDocumentsRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new UpdateDocumentsRepository(db);
  }

  async activateDoc(id: string, userId: string, env: Env) {
    const result = await this.repo.activateDocument(id);
    if (!result) {
      throw new AppError(404, 'NOT_FOUND', 'Document not found');
    }

    await this.repo.logAudit({
      userId,
      action: 'update',
      resource: 'documents',
      resourceId: id,
      summary: `Activated ${result.target.type} (${result.target.locale})`,
    });

    await revalidate(env, ['site', 'documents']);
    return result.activated;
  }

  async updatePreset(id: string, dto: UpdateExportPresetBodyDto, userId: string) {
    await assertPresetCodes(this.repo.db, dto);
    const updated = await this.repo.updatePreset(id, {
      ...dto,
      sinceYears: dto.sinceYears ?? null,
    });
    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', 'Export preset not found');
    }

    await this.repo.logAudit({
      userId,
      action: 'update',
      resource: 'export_presets',
      resourceId: id,
      summary: `Updated export preset ${dto.slug}`,
    });

    return updated;
  }

  async updateShareLink(id: string, dto: UpdateShareLinkBodyDto, userId: string) {
    const { label, isActive, expiresAt } = dto;
    const updated = await this.repo.updateShareLink(id, {
      ...(label !== undefined ? { label } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
    });
    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', 'Share link not found');
    }

    await this.repo.logAudit({
      userId,
      action: 'update',
      resource: 'share_links',
      resourceId: id,
      summary: `Updated share link "${updated.label}"`,
    });

    return updated;
  }
}
