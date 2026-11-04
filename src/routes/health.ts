import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { ok } from '@/lib/response';
import type { AppEnv } from '@/types/env';

export const healthRoute = new OpenAPIHono<AppEnv>();

const getHealthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['System'],
  summary: 'Check API and database health',
  responses: {
    200: {
      description: 'Health check result',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              status: z.literal('ok'),
              db: z.enum(['ok', 'error']),
              time: z.string(),
            }),
          }),
        },
      },
    },
  },
});

healthRoute.openapi(getHealthRoute, async (c) => {
  let dbStatus: 'ok' | 'error' = 'ok';

  if (c.env?.DATABASE_URL) {
    try {
      const db = getDb(c.env);
      await db.execute(sql`SELECT 1`);
      dbStatus = 'ok';
    } catch {
      dbStatus = 'error';
    }
  }

  return ok(c, {
    status: 'ok' as const,
    db: dbStatus,
    time: new Date().toISOString(),
  });
});
