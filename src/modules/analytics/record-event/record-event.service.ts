import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import { getHashSalt, visitorHash } from '@/lib/hash';
import { deviceOf } from '@/lib/ua';
import type { Env } from '@/types/env';
import type { RecordEventBodyDto } from './record-event.dto';
import { RecordEventRepository } from './record-event.repository';

export class RecordEventService extends BaseService {
  protected override readonly repo: RecordEventRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new RecordEventRepository(db);
  }

  async execute(dto: RecordEventBodyDto, rawIp: string, ua: string, country: string | null, env: Env) {
    const utcDate = new Date().toISOString().slice(0, 10);
    const vHash = await visitorHash(rawIp, ua, utcDate, getHashSalt(env));
    const device = deviceOf(ua);

    await this.repo.insertEvent({
      type: dto.type,
      path: dto.path,
      locale: dto.locale ?? null,
      projectId: dto.projectId ?? null,
      target: dto.target ?? null,
      shareLinkId: dto.shareLinkId ?? null,
      visitorHash: vHash,
      country,
      referrer: dto.referrer ?? null,
      utmSource: dto.utmSource ?? null,
      utmCampaign: dto.utmCampaign ?? null,
      device,
    });
  }
}
