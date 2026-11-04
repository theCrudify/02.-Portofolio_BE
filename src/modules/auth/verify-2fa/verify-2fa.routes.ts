import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/types/env';
import { Verify2faController } from './verify-2fa.controller';
import { verify2faDoc } from './verify-2fa.doc';

export const verify2faRoutes = new OpenAPIHono<AppEnv>({
  defaultHook: (result) => {
    if (!result.success) {
      throw result.error;
    }
  },
});

const controller = new Verify2faController();

verify2faRoutes.openapi(verify2faDoc, (c) => controller.handle(c, c.req.valid('json')));

