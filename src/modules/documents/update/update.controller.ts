import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { updateExportPresetBodySchema, updateShareLinkBodySchema } from './update.dto';
import { UpdateDocumentsService } from './update.service';

export class UpdateDocumentsController extends BaseController {
  handleActivateDocument = async (c: Context) => {
    const id = c.req.param('id')!;
    const user = c.get('user')!;
    const service = new UpdateDocumentsService(this.getDb(c));
    const activated = await service.activateDoc(id, user.id, c.env);
    return this.success(c, activated);
  };

  handleUpdatePreset = async (c: Context) => {
    const id = c.req.param('id')!;
    const dto = await this.parseBody(c, updateExportPresetBodySchema, 'Invalid export preset payload');
    const user = c.get('user')!;
    const service = new UpdateDocumentsService(this.getDb(c));
    const updated = await service.updatePreset(id, dto, user.id);
    return this.success(c, updated);
  };

  handleUpdateShareLink = async (c: Context) => {
    const id = c.req.param('id')!;
    const dto = await this.parseBody(c, updateShareLinkBodySchema, 'Invalid share link update payload');
    const user = c.get('user')!;
    const service = new UpdateDocumentsService(this.getDb(c));
    const updated = await service.updateShareLink(id, dto, user.id);
    return this.success(c, updated);
  };
}
