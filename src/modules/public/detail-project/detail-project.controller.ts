import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { generateEtag, HTTP_CACHE_HEADER, isNotModified } from '@/core/cache/http-cache';
import { parseLocale } from '@/lib/locale';
import { detailPublicProjectQuerySchema } from './detail-project.dto';
import { DetailPublicProjectService } from './detail-project.service';

export class DetailPublicProjectController extends BaseController {
  handle = async (c: Context) => {
    const slug = c.req.param('slug') ?? '';
    const query = this.parseQuery(c, detailPublicProjectQuerySchema);
    const locale = parseLocale(query.locale);
    const service = new DetailPublicProjectService(this.getDb(c));
    const detail = await service.execute(slug, locale);

    const etag = await generateEtag(detail);
    c.header('ETag', etag);
    c.header('Cache-Control', HTTP_CACHE_HEADER);

    if (isNotModified(c, etag)) {
      return c.body(null, 304);
    }

    return this.success(c, detail);
  };
}
