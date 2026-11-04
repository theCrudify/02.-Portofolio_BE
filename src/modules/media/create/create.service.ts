import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import { validateRegisteredMedia } from '@/lib/cloudinary';
import type { CreateMediaBodyDto } from './create.dto';
import { CreateMediaRepository } from './create.repository';

export class CreateMediaService extends BaseService {
  protected override readonly repo: CreateMediaRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new CreateMediaRepository(db);
  }

  async execute(dto: CreateMediaBodyDto, userId: string) {
    validateRegisteredMedia({
      kind: dto.kind,
      bytes: dto.bytes,
      durationSec: dto.durationSec,
    });

    const dbKind: 'image' | 'video' | 'pdf' = dto.kind === 'document' ? 'pdf' : dto.kind;

    const created = await this.repo.insertMedia({
      provider: 'cloudinary',
      kind: dbKind,
      publicId: dto.publicId,
      url: dto.url,
      mime: dto.mime ?? null,
      width: dto.width ?? null,
      height: dto.height ?? null,
      bytes: dto.bytes ?? null,
      durationSec: dto.durationSec ?? null,
      thumbnailUrl: dto.thumbnailUrl ?? null,
      captionsUrl: dto.captionsUrl ?? null,
      titleEn: dto.titleEn ?? null,
      titleId: dto.titleId ?? null,
      altEn: dto.altEn ?? null,
      altId: dto.altId ?? null,
      uploadedBy: userId,
    });

    await this.repo.logAudit({
      userId,
      action: 'create',
      resource: 'media',
      resourceId: created.id,
      summary: `Uploaded ${dbKind} (${dto.publicId})`,
    });

    return created;
  }
}
