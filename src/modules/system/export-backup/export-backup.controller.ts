import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { ExportBackupService } from './export-backup.service';

export class ExportBackupController extends BaseController {
  handle = async (c: Context) => {
    const service = new ExportBackupService(this.getDb(c));
    const bundle = await service.execute();
    return this.success(c, bundle);
  };
}
