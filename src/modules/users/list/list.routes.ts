import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/types/env';
import { ListUsersController } from './list.controller';

export const listUsersRoutes = new OpenAPIHono<AppEnv>();
const controller = new ListUsersController();

listUsersRoutes.get('/', (c) => controller.handle(c));
