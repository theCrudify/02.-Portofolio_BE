import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { listMediaQuerySchema } from './list.dto';
import { ListMediaService } from './list.service';

export class ListMediaController extends BaseController {
  handle = async (c: Context) => {
    const query = this.parseQuery(c, listMediaQuerySchema);
    const service = new ListMediaService(this.getDb(c));
    const { rows, meta } = await service.execute(query);
    return this.success(c, rows, meta);
  };
}
