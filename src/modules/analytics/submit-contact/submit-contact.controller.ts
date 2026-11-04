import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { submitContactBodySchema } from './submit-contact.dto';
import { SubmitContactService } from './submit-contact.service';

export class SubmitContactController extends BaseController {
  handle = async (c: Context) => {
    const dto = await this.parseBody(c, submitContactBodySchema, 'Invalid contact form payload');
    const rawIp =
      c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? '127.0.0.1';
    const service = new SubmitContactService(this.getDb(c));
    const result = await service.execute(dto, rawIp, c.env);
    if (result.honeypot) {
      return this.success(c, result.data);
    }
    return this.created(c, result.data);
  };
}
