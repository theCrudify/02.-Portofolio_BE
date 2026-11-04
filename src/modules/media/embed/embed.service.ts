import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import { resolveVideoEmbed } from '@/lib/oembed';
import type { EmbedMediaBodyDto } from './embed.dto';
import { EmbedMediaRepository } from './embed.repository';

export class EmbedMediaService extends BaseService {
  protected override readonly repo: EmbedMediaRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new EmbedMediaRepository(db);
  }

  async execute(dto: EmbedMediaBodyDto, userId: string) {
    const resolved = await resolveVideoEmbed(dto.url);
    const created = await this.repo.insertMedia({
      provider: resolved.provider,
      kind: 'video',
      embedId: resolved.embedId,
      url: resolved.url,
      thumbnailUrl: resolved.thumbnailUrl,
      durationSec: resolved.durationSec,
      titleEn: dto.titleEn ?? resolved.titleEn ?? null,
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
      summary: `Embedded ${resolved.provider} video (${resolved.embedId})`,
    });

    return created;
  }
}
