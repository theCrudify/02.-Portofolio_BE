import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { embedMediaBodySchema } from './embed.dto';
import { EmbedMediaService } from './embed.service';

export class EmbedMediaController extends BaseController {
  handle = async (c: Context) => {
    const dto = await this.parseBody(c, embedMediaBodySchema, 'Invalid video embed payload');
    const user = c.get('user')!;
    const service = new EmbedMediaService(this.getDb(c));
    const created = await service.execute(dto, user.id);
    return this.created(c, created);
  };
}
