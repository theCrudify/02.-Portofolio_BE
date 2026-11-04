import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { parseLocale } from '@/lib/locale';
import { exportCvQuerySchema } from './export.dto';
import { ExportDocumentsService } from './export.service';

export class ExportDocumentsController extends BaseController {
  handleCv = async (c: Context) => {
    const query = this.parseQuery(c, exportCvQuerySchema);
    const locale = parseLocale(query.locale);
    const docType: 'cv' | 'portfolio_pdf' | 'other' =
      query.type === 'portfolio_pdf' || query.type === 'other' ? query.type : 'cv';

    const service = new ExportDocumentsService(this.getDb(c));
    const result = await service.getActiveCv(docType, locale);
    return this.success(c, result);
  };

  handleResumeJson = async (c: Context) => {
    const query = this.parseQuery(c, exportCvQuerySchema);
    const locale = parseLocale(query.locale);
    const service = new ExportDocumentsService(this.getDb(c));
    const resume = await service.getJsonResume(locale);
    return this.success(c, resume);
  };

  handlePresetExport = async (c: Context) => {
    const slug = c.req.param('presetSlug')!;
    const query = this.parseQuery(c, exportCvQuerySchema);
    const localeOverride = query.locale as 'en' | 'id' | undefined;
    const service = new ExportDocumentsService(this.getDb(c));
    const payload = await service.getPresetExport(slug, localeOverride);
    return this.success(c, payload);
  };

  handleShareToken = async (c: Context) => {
    const token = c.req.param('token')!;
    const rawIp =
      c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? '127.0.0.1';
    const ua = c.req.header('user-agent') ?? '';
    const service = new ExportDocumentsService(this.getDb(c));
    const payload = await service.resolveShareToken(token, rawIp, ua, c.env);
    return this.success(c, payload);
  };
}
