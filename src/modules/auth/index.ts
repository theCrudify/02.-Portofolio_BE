import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/types/env';
import { loginRoutes } from './login';
import { verify2faRoutes } from './verify-2fa';
import { setup2faRoutes } from './setup-2fa';
import { enable2faRoutes } from './enable-2fa';
import { disable2faRoutes } from './disable-2fa';
import { changePasswordRoutes } from './change-password';
import { logoutRoutes } from './logout';
import { meRoutes } from './me';

export const authModuleRoutes = new OpenAPIHono<AppEnv>({
  defaultHook: (result) => {
    if (!result.success) {
      throw result.error;
    }
  },
});

authModuleRoutes.route('/', loginRoutes);
authModuleRoutes.route('/', verify2faRoutes);
authModuleRoutes.route('/', setup2faRoutes);
authModuleRoutes.route('/', enable2faRoutes);
authModuleRoutes.route('/', disable2faRoutes);
authModuleRoutes.route('/', changePasswordRoutes);
authModuleRoutes.route('/', logoutRoutes);
authModuleRoutes.route('/', meRoutes);

export * from './login';
export * from './verify-2fa';
export * from './setup-2fa';
export * from './enable-2fa';
export * from './disable-2fa';
export * from './change-password';
export * from './logout';
export * from './me';
