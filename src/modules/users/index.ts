import { OpenAPIHono } from '@hono/zod-openapi';
import { requireAuth } from '@/middleware/auth';
import { requireRole } from '@/middleware/require-role';
import type { AppEnv } from '@/types/env';
import { listUsersRoutes } from './list';
import { createUserRoutes } from './create';
import { updateUserRoutes } from './update';
import { deleteUserRoutes } from './delete';

export const usersModuleRoutes = new OpenAPIHono<AppEnv>();

usersModuleRoutes.use('*', requireAuth, requireRole('owner'));
usersModuleRoutes.route('/', listUsersRoutes);
usersModuleRoutes.route('/', createUserRoutes);
usersModuleRoutes.route('/', updateUserRoutes);
usersModuleRoutes.route('/', deleteUserRoutes);

export * from './list';
export * from './create';
export * from './update';
export * from './delete';
