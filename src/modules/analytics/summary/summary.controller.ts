import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { analyticsSummaryQuerySchema } from './summary.dto';
import { AnalyticsSummaryService } from './summary.service';

export class AnalyticsSummaryController extends BaseController {
  handle = async (c: Context) => {
    const query = this.parseQuery(c, analyticsSummaryQuerySchema);
    const service = new AnalyticsSummaryService(this.getDb(c));
    const data = await service.execute(query);
    return this.success(c, data);
  };
}
