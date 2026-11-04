import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/types/env';
import { LoginController } from './login.controller';
import { loginDoc } from './login.doc';

export const loginRoutes = new OpenAPIHono<AppEnv>({
  defaultHook: (result) => {
    if (!result.success) {
      throw result.error;
    }
  },
});

const controller = new LoginController();

loginRoutes.openapi(loginDoc, (c) => controller.handle(c, c.req.valid('json')));

