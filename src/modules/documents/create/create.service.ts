import { assertLookupCodes } from '@/db/queries/lookups';
import { assertPresetCodes } from '@/services/document.service';
import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import type {
  CreateDocumentBodyDto,
  CreateExportPresetBodyDto,
  CreateShareLinkBodyDto,
} from './create.dto';
import { CreateDocumentsRepository } from './create.repository';

export class CreateDocumentsService extends BaseService {
  protected override readonly repo: CreateDocumentsRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new CreateDocumentsRepository(db);
  }

  async executeDocument(dto: CreateDocumentBodyDto, userId: string) {
    await assertLookupCodes(this.repo.db, {
      type: ['document_type', dto.type],
      locale: ['locale', dto.locale],
    });
    const created = await this.repo.insertDocument(dto);
    await this.repo.logAudit({
      userId,
      action: 'create',
      resource: 'documents',
      resourceId: created.id,
      summary: `Registered ${dto.type} (${dto.locale})`,
    });
    return created;
  }

  async executePreset(dto: CreateExportPresetBodyDto, userId: string) {
    await assertPresetCodes(this.repo.db, dto);
    const created = await this.repo.insertPreset({
      ...dto,
      sinceYears: dto.sinceYears ?? null,
    });
    await this.repo.logAudit({
      userId,
      action: 'create',
      resource: 'export_presets',
      resourceId: created.id,
      summary: `Created export preset ${dto.slug}`,
    });
    return created;
  }

  async executeShareLink(dto: CreateShareLinkBodyDto, userId: string) {
    const created = await this.repo.insertShareLink({
      label: dto.label,
      documentId: dto.documentId ?? null,
      presetId: dto.presetId ?? null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      createdBy: userId,
    });
    await this.repo.logAudit({
      userId,
      action: 'create',
      resource: 'share_links',
      resourceId: created.id,
      summary: `Created share link "${dto.label}"`,
    });
    return created;
  }
}
