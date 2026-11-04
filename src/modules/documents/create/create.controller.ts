import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import {
  createDocumentBodySchema,
  createExportPresetBodySchema,
  createShareLinkBodySchema,
} from './create.dto';
import { CreateDocumentsService } from './create.service';

export class CreateDocumentsController extends BaseController {
  handleDocument = async (c: Context) => {
    const dto = await this.parseBody(c, createDocumentBodySchema, 'Invalid document payload');
    const user = c.get('user')!;
    const service = new CreateDocumentsService(this.getDb(c));
    const created = await service.executeDocument(dto, user.id);
    return this.created(c, created);
  };

  handlePreset = async (c: Context) => {
    const dto = await this.parseBody(c, createExportPresetBodySchema, 'Invalid export preset payload');
    const user = c.get('user')!;
    const service = new CreateDocumentsService(this.getDb(c));
    const created = await service.executePreset(dto, user.id);
    return this.created(c, created);
  };

  handleShareLink = async (c: Context) => {
    const dto = await this.parseBody(c, createShareLinkBodySchema, 'Invalid share link payload');
    const user = c.get('user')!;
    const service = new CreateDocumentsService(this.getDb(c));
    const created = await service.executeShareLink(dto, user.id);
    return this.created(c, created);
  };
}
