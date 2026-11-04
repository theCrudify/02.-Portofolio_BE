import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/types/env';
import { CreateUserController } from './create.controller';

export const createUserRoutes = new OpenAPIHono<AppEnv>();
const controller = new CreateUserController();

createUserRoutes.post('/', (c) => controller.handle(c));
