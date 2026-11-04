import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createContainer } from '@/core/container';
import { getDb } from '@/db/client';
import type { AppEnv } from '@/types/env';
import {
  certificationsQuerySchema,
  projectSlugParamSchema,
  projectsQuerySchema,
  siteQuerySchema,
} from '@/validators/public';

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
    304: {
      description: 'Not modified',
    },
  },
});

publicRoute.openapi(getSiteRoute, async (c) => {
  const db = getDb(c.env);
  const container = createContainer(db);
  return container.publicController.getSite(c);
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
    304: {
      description: 'Not modified',
    },
  },
});

publicRoute.openapi(getProjectsRoute, async (c) => {
  const db = getDb(c.env);
  const container = createContainer(db);
  return container.publicController.listProjects(c);
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
    304: {
      description: 'Not modified',
    },
    404: {
      description: 'Project not found or not published',
    },
  },
});

publicRoute.openapi(getProjectBySlugRoute, async (c) => {
  const db = getDb(c.env);
  const container = createContainer(db);
  return container.publicController.getProjectBySlug(c);
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
    304: {
      description: 'Not modified',
    },
  },
});

publicRoute.openapi(getCertificationsRoute, async (c) => {
  const db = getDb(c.env);
  const container = createContainer(db);
  return container.publicController.listCertifications(c);
});
