import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getDb } from '@/db/client';
import { parseLocale } from '@/lib/locale';
import { ok } from '@/lib/response';
import { listCertifications } from '@/services/certification.service';
import { getProjectBySlug, listProjects } from '@/services/project.service';
import { getSite } from '@/services/site.service';
import type { AppEnv } from '@/types/env';
import {
  certificationsQuerySchema,
  projectSlugParamSchema,
  projectsQuerySchema,
  siteQuerySchema,
} from '@/validators/public';

export const PUBLIC_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=86400';

export const publicRoute = new OpenAPIHono<AppEnv>({
  defaultHook: (result) => {
    if (!result.success) {
      throw result.error;
    }
  },
});

const getSiteRoute = createRoute({
  method: 'get',
  path: '/site',
  tags: ['Public'],
  summary: 'Get aggregated site data for homepage and layout',
  request: {
    query: siteQuerySchema,
  },
  responses: {
    200: {
      description: 'Aggregated site data',
      content: {
        'application/json': {
          schema: z.object({
            data: z.unknown(),
          }),
        },
      },
    },
  },
});

publicRoute.openapi(getSiteRoute, async (c) => {
  const { locale: rawLocale } = c.req.valid('query');
  const locale = parseLocale(rawLocale);
  const db = getDb(c.env);
  const data = await getSite(db, locale);
  c.header('Cache-Control', PUBLIC_CACHE_CONTROL);
  return ok(c, data);
});

const getProjectsRoute = createRoute({
  method: 'get',
  path: '/projects',
  tags: ['Public'],
  summary: 'List published projects with optional technology and type filters',
  request: {
    query: projectsQuerySchema,
  },
  responses: {
    200: {
      description: 'Paginated published project cards',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(z.unknown()),
            meta: z.object({
              page: z.number(),
              limit: z.number(),
              total: z.number(),
            }),
          }),
        },
      },
    },
  },
});

publicRoute.openapi(getProjectsRoute, async (c) => {
  const query = c.req.valid('query');
  const locale = parseLocale(query.locale);
  const db = getDb(c.env);
  const result = await listProjects(db, {
    locale,
    technology: query.technology,
    type: query.type,
    page: query.page,
    limit: query.limit,
  });
  c.header('Cache-Control', PUBLIC_CACHE_CONTROL);
  return ok(c, result.items, result.meta);
});

const getProjectBySlugRoute = createRoute({
  method: 'get',
  path: '/projects/{slug}',
  tags: ['Public'],
  summary: 'Get published project case study detail by slug',
  request: {
    params: projectSlugParamSchema,
    query: siteQuerySchema,
  },
  responses: {
    200: {
      description: 'Project detail with prev/next navigation',
      content: {
        'application/json': {
          schema: z.object({
            data: z.unknown(),
          }),
        },
      },
    },
    404: {
      description: 'Project not found or not published',
    },
  },
});

publicRoute.openapi(getProjectBySlugRoute, async (c) => {
  const { slug } = c.req.valid('param');
  const { locale: rawLocale } = c.req.valid('query');
  const locale = parseLocale(rawLocale);
  const db = getDb(c.env);
  const detail = await getProjectBySlug(db, slug, locale);
  c.header('Cache-Control', PUBLIC_CACHE_CONTROL);
  return ok(c, detail);
});

const getCertificationsRoute = createRoute({
  method: 'get',
  path: '/certifications',
  tags: ['Public'],
  summary: 'List published certifications and courses',
  request: {
    query: certificationsQuerySchema,
  },
  responses: {
    200: {
      description: 'Published certifications',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(z.unknown()),
          }),
        },
      },
    },
  },
});

publicRoute.openapi(getCertificationsRoute, async (c) => {
  const query = c.req.valid('query');
  const locale = parseLocale(query.locale);
  const db = getDb(c.env);
  const items = await listCertifications(db, {
    locale,
    type: query.type,
  });
  c.header('Cache-Control', PUBLIC_CACHE_CONTROL);
  return ok(c, items);
});
