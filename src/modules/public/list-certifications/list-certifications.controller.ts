import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { generateEtag, HTTP_CACHE_HEADER, isNotModified } from '@/core/cache/http-cache';
import { parseLocale } from '@/lib/locale';
import { listPublicCertificationsQuerySchema } from './list-certifications.dto';
import { ListPublicCertificationsService } from './list-certifications.service';

export class ListPublicCertificationsController extends BaseController {
  handle = async (c: Context) => {
    const query = this.parseQuery(c, listPublicCertificationsQuerySchema);
    const locale = parseLocale(query.locale);
    const service = new ListPublicCertificationsService(this.getDb(c));
    const { items, meta } = await service.execute(locale, query);

    const etag = await generateEtag(items);
    c.header('ETag', etag);
    c.header('Cache-Control', HTTP_CACHE_HEADER);

    if (isNotModified(c, etag)) {
      return c.body(null, 304);
    }

    return this.success(c, items, meta);
  };
}
