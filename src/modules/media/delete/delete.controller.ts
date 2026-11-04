import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { DeleteMediaService } from './delete.service';

export class DeleteMediaController extends BaseController {
  handle = async (c: Context) => {
    const id = c.req.param('id')!;
    const user = c.get('user')!;
    const service = new DeleteMediaService(this.getDb(c));
    await service.execute(id, user.id);
    return this.noContent(c);
  };
}
