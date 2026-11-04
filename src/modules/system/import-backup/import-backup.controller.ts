import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { importBackupBodySchema, importBackupQuerySchema } from './import-backup.dto';
import { ImportBackupService } from './import-backup.service';

export class ImportBackupController extends BaseController {
  handle = async (c: Context) => {
    const query = this.parseQuery(c, importBackupQuerySchema);
    const dto = await this.parseBody(c, importBackupBodySchema, 'Invalid backup bundle format');
    const user = c.get('user')!;
    const service = new ImportBackupService(this.getDb(c));
    const result = await service.execute(dto, Boolean(query.dryRun), user.id, c.env);
    return this.success(c, result);
  };
}
