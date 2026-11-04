import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { listMessagesQuerySchema } from './list-messages.dto';
import { ListMessagesService } from './list-messages.service';

export class ListMessagesController extends BaseController {
  handle = async (c: Context) => {
    const query = this.parseQuery(c, listMessagesQuerySchema);
    const service = new ListMessagesService(this.getDb(c));
    const { rows, meta } = await service.execute(query);
    return this.success(c, rows, meta);
  };
}
