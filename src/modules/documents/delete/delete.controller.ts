import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { DeleteDocumentsService } from './delete.service';

export class DeleteDocumentsController extends BaseController {
  handleDeleteDocument = async (c: Context) => {
    const id = c.req.param('id')!;
    const user = c.get('user')!;
    const service = new DeleteDocumentsService(this.getDb(c));
    await service.deleteDoc(id, user.id, c.env);
    return this.noContent(c);
  };

  handleDeletePreset = async (c: Context) => {
    const id = c.req.param('id')!;
    const user = c.get('user')!;
    const service = new DeleteDocumentsService(this.getDb(c));
    await service.deletePreset(id, user.id);
    return this.noContent(c);
  };

  handleDeleteShareLink = async (c: Context) => {
    const id = c.req.param('id')!;
    const user = c.get('user')!;
    const service = new DeleteDocumentsService(this.getDb(c));
    await service.deleteShareLink(id, user.id);
    return this.noContent(c);
  };
}
