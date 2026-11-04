import type { Context } from 'hono';
import { generateEtag, HTTP_CACHE_HEADER, isNotModified } from '@/core/cache/http-cache';
import { parseLocale } from '@/lib/locale';
import { ok } from '@/lib/response';
import type { CertificationService } from '@/services/certification.service';
import type { ProjectService } from '@/services/project.service';
import type { SiteService } from '@/services/site.service';

/**
 * PublicController: OOP controller handling public-facing endpoints.
 * Integrates ETags, HTTP conditional caching (304 Not Modified), and Cache-Control headers.
 */
export class PublicController {
  constructor(
    private readonly siteService: SiteService,
    private readonly projectService: ProjectService,
    private readonly certificationService: CertificationService,
  ) {}

  /**
   * GET /v1/site
   */
  async getSite(c: Context) {
    const rawLocale = c.req.query('locale');
    const locale = parseLocale(rawLocale);
    const data = await this.siteService.getSite(locale);

    const etag = await generateEtag(data);
    c.header('ETag', etag);
    c.header('Cache-Control', HTTP_CACHE_HEADER);

    if (isNotModified(c, etag)) {
      return c.body(null, 304);
    }

    return ok(c, data);
  }

  /**
   * GET /v1/projects
   */
  async listProjects(c: Context) {
    const rawLocale = c.req.query('locale');
    const locale = parseLocale(rawLocale);
    const technology = c.req.query('technology') || undefined;
    const type = c.req.query('type') as
      | 'personal'
      | 'freelance'
      | 'company'
      | 'open_source'
      | 'hackathon'
      | undefined;
    const page = c.req.query('page') ? Number(c.req.query('page')) : undefined;
    const limit = c.req.query('limit') ? Number(c.req.query('limit')) : undefined;

    const result = await this.projectService.listProjects({
      locale,
      technology,
      type,
      page,
      limit,
    });

    const etag = await generateEtag(result);
    c.header('ETag', etag);
    c.header('Cache-Control', HTTP_CACHE_HEADER);

    if (isNotModified(c, etag)) {
      return c.body(null, 304);
    }

    return ok(c, result.items, result.meta);
  }

  /**
   * GET /v1/projects/:slug
   */
  async getProjectBySlug(c: Context) {
    const slug = c.req.param('slug') ?? '';
    const rawLocale = c.req.query('locale');
    const locale = parseLocale(rawLocale);

    const detail = await this.projectService.getProjectBySlug(slug, locale);

    const etag = await generateEtag(detail);
    c.header('ETag', etag);
    c.header('Cache-Control', HTTP_CACHE_HEADER);

    if (isNotModified(c, etag)) {
      return c.body(null, 304);
    }

    return ok(c, detail);
  }

  /**
   * GET /v1/certifications
   */
  async listCertifications(c: Context) {
    const rawLocale = c.req.query('locale');
    const locale = parseLocale(rawLocale);
    const type = c.req.query('type') as
      | 'certification'
      | 'course'
      | 'bootcamp'
      | 'training'
      | undefined;

    const items = await this.certificationService.listCertifications({
      locale,
      type,
    });

    const etag = await generateEtag(items);
    c.header('ETag', etag);
    c.header('Cache-Control', HTTP_CACHE_HEADER);

    if (isNotModified(c, etag)) {
      return c.body(null, 304);
    }

    return ok(c, items);
  }
}
