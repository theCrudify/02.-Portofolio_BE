import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { generateEtag, HTTP_CACHE_HEADER, isNotModified } from '@/core/cache/http-cache';
import { parseLocale } from '@/lib/locale';
import { listPublicProjectsQuerySchema } from './list-projects.dto';
import { ListPublicProjectsService } from './list-projects.service';

export class ListPublicProjectsController extends BaseController {
  handle = async (c: Context) => {
    const query = this.parseQuery(c, listPublicProjectsQuerySchema);
    const locale = parseLocale(query.locale);
    const service = new ListPublicProjectsService(this.getDb(c));
    const result = await service.execute(locale, query);

    const etag = await generateEtag(result);
    c.header('ETag', etag);
    c.header('Cache-Control', HTTP_CACHE_HEADER);

    if (isNotModified(c, etag)) {
      return c.body(null, 304);
    }

    return this.success(c, result.items, result.meta);
  };
}
