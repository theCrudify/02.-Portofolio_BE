import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { createMediaBodySchema } from './create.dto';
import { CreateMediaService } from './create.service';

export class CreateMediaController extends BaseController {
  handle = async (c: Context) => {
    const dto = await this.parseBody(c, createMediaBodySchema, 'Invalid media registration payload');
    const user = c.get('user')!;
    const service = new CreateMediaService(this.getDb(c));
    const created = await service.execute(dto, user.id);
    return this.created(c, created);
  };
}
