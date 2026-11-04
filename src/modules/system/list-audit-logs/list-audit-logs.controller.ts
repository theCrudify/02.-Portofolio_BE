import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { listAuditLogsQuerySchema } from './list-audit-logs.dto';
import { ListAuditLogsService } from './list-audit-logs.service';

export class ListAuditLogsController extends BaseController {
  handle = async (c: Context) => {
    const query = this.parseQuery(c, listAuditLogsQuerySchema);
    const service = new ListAuditLogsService(this.getDb(c));
    const { rows, meta } = await service.execute(query);
    return this.success(c, rows, meta);
  };
}
