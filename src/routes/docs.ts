import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import type { AppEnv } from '@/types/env';

export function registerDocsRoutes(app: OpenAPIHono<AppEnv>): void {
  app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
      title: 'Portfolio API',
      version: '1.0.0',
      description: 'REST API for bilingual personal portfolio and admin panel',
    },
  });

  app.get(
    '/docs',
    apiReference({
      url: '/openapi.json',
      pageTitle: 'Portfolio API Reference',
    }),
  );
}
