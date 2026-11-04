import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { updateMediaBodySchema } from './update.dto';
import { UpdateMediaService } from './update.service';

export class UpdateMediaController extends BaseController {
  handle = async (c: Context) => {
    const id = c.req.param('id')!;
    const dto = await this.parseBody(c, updateMediaBodySchema, 'Invalid media update payload');
    const user = c.get('user')!;
    const service = new UpdateMediaService(this.getDb(c));
    const updated = await service.execute(id, dto, user.id, c.env);
    return this.success(c, updated);
  };
}
