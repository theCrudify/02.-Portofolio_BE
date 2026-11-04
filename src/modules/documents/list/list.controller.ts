import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { listDocumentsQuerySchema } from './list.dto';
import { ListDocumentsService } from './list.service';

export class ListDocumentsController extends BaseController {
  handleDocuments = async (c: Context) => {
    const query = this.parseQuery(c, listDocumentsQuerySchema);
    const service = new ListDocumentsService(this.getDb(c));
    const { rows, meta } = await service.executeDocuments(query);
    return this.success(c, rows, meta);
  };

  handlePresets = async (c: Context) => {
    const query = this.parseQuery(c, listDocumentsQuerySchema);
    const service = new ListDocumentsService(this.getDb(c));
    const { rows, meta } = await service.executePresets(query);
    return this.success(c, rows, meta);
  };

  handleShareLinks = async (c: Context) => {
    const query = this.parseQuery(c, listDocumentsQuerySchema);
    const service = new ListDocumentsService(this.getDb(c));
    const { rows, meta } = await service.executeShareLinks(query);
    return this.success(c, rows, meta);
  };
}
