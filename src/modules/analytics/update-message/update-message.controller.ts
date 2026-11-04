import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { updateMessageBodySchema } from './update-message.dto';
import { UpdateMessageService } from './update-message.service';

export class UpdateMessageController extends BaseController {
  handle = async (c: Context) => {
    const id = c.req.param('id')!;
    const dto = await this.parseBody(c, updateMessageBodySchema, 'Invalid message update payload');
    const service = new UpdateMessageService(this.getDb(c));
    const updated = await service.execute(id, dto);
    return this.success(c, updated);
  };
}
