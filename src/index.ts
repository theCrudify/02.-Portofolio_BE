import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimitMiddleware } from '@/middleware/body-limit';
import { csrfMiddleware } from '@/middleware/csrf';
import { errorHandler, notFoundHandler } from '@/middleware/error';
import { requestIdMiddleware } from '@/middleware/request-id';
import { registerDocsRoutes } from '@/routes/docs';
import adminResources from '@/routes/admin/resources';
import { adminUsersRoute } from '@/routes/admin/users';
import { authRoute } from '@/routes/auth';
import { healthRoute } from '@/routes/health';
import { publicRoute } from '@/routes/public';
import type { AppEnv, Bindings } from '@/types/env';


export function createApp(): OpenAPIHono<AppEnv> {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result) => {
      if (!result.success) {
        throw result.error;
      }
    },
  });

  // 1. Request ID
  app.use('*', requestIdMiddleware);

  // 2. Secure Headers (CSP default-src 'none' for API routes, relaxed on /docs)
  app.use('*', async (c, next) => {
    if (c.req.path === '/docs' || c.req.path.startsWith('/docs/')) {
      const middleware = secureHeaders();
      return middleware(c, next);
    }
    const middleware = secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    });
    return middleware(c, next);
  });

  // 3. CORS
  app.use('*', async (c, next) => {
    const allowedOrigin = c.env?.FRONTEND_URL || 'http://localhost:3000';
    const corsMiddleware = cors({
      origin: allowedOrigin,
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    });
    return corsMiddleware(c, next);
  });

  // 4. Body Limit (1 MB)
  app.use('*', bodyLimitMiddleware);

  // 5. CSRF protection on /v1/admin/* and /v1/auth/*
  app.use('*', csrfMiddleware);

  // Error & 404 handlers
  app.onError(errorHandler);
  app.notFound(notFoundHandler);

  // Routes
  app.route('/', healthRoute);
  app.route('/v1', publicRoute);
  app.route('/v1/auth', authRoute);
  app.route('/v1/admin/users', adminUsersRoute);
  app.route('/', adminResources);
  registerDocsRoutes(app);


  return app;
}

export const app = createApp();

export async function scheduled(
  _event: ScheduledEvent,
  _env: Bindings,
  _ctx: ExecutionContext,
): Promise<void> {
  // Populated in T11
}

export default {
  fetch: app.fetch,
  scheduled,
};
