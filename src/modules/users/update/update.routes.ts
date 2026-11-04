import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/types/env';
import { UpdateUserController } from './update.controller';

export const updateUserRoutes = new OpenAPIHono<AppEnv>();
const controller = new UpdateUserController();

updateUserRoutes.put('/:id', (c) => controller.handle(c));
