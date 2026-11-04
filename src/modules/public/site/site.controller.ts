import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { generateEtag, HTTP_CACHE_HEADER, isNotModified } from '@/core/cache/http-cache';
import { parseLocale } from '@/lib/locale';
import { getSiteQuerySchema } from './site.dto';
import { GetSiteService } from './site.service';

export class GetSiteController extends BaseController {
  handle = async (c: Context) => {
    const query = this.parseQuery(c, getSiteQuerySchema);
    const locale = parseLocale(query.locale);
    const service = new GetSiteService(this.getDb(c));
    const data = await service.execute(locale);

    const etag = await generateEtag(data);
    c.header('ETag', etag);
    c.header('Cache-Control', HTTP_CACHE_HEADER);

    if (isNotModified(c, etag)) {
      return c.body(null, 304);
    }

    return this.success(c, data);
  };
}
