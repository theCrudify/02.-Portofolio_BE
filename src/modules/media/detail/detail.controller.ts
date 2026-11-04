import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { DetailMediaService } from './detail.service';

export class DetailMediaController extends BaseController {
  handle = async (c: Context) => {
    const id = c.req.param('id')!;
    const service = new DetailMediaService(this.getDb(c));
    const row = await service.execute(id);
    return this.success(c, row);
  };
}
