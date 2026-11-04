import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/types/env';
import { DeleteUserController } from './delete.controller';

export const deleteUserRoutes = new OpenAPIHono<AppEnv>();
const controller = new DeleteUserController();

deleteUserRoutes.delete('/:id', (c) => controller.handle(c));
