import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { HealthService } from './health.service';

export class HealthController extends BaseController {
  handle = async (c: Context) => {
    const service = new HealthService();
    const status = await service.execute(c.env);
    return this.success(c, status);
  };
}
