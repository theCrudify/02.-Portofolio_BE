import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { signMediaBodySchema } from './sign.dto';
import { SignMediaService } from './sign.service';

export class SignMediaController extends BaseController {
  handle = async (c: Context) => {
    const dto = await this.parseBody(c, signMediaBodySchema, 'Invalid media sign payload');
    const service = new SignMediaService(this.getDb(c));
    const signed = await service.execute(c.env, dto);
    return this.success(c, signed);
  };
}
