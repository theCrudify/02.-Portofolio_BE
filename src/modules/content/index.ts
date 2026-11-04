import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/types/env';
import { singletonContentRoutes } from './singleton';
import { reorderContentRoutes } from './reorder';
import { listContentRoutes } from './list';
import { createContentRoutes } from './create';
import { detailContentRoutes } from './detail';
import { updateContentRoutes } from './update';
import { deleteContentRoutes } from './delete';
import { transitionContentRoutes } from './transition';

export const contentModuleRoutes = new OpenAPIHono<AppEnv>();

contentModuleRoutes.route('/', singletonContentRoutes);
contentModuleRoutes.route('/', reorderContentRoutes);
contentModuleRoutes.route('/', listContentRoutes);
contentModuleRoutes.route('/', createContentRoutes);
contentModuleRoutes.route('/', detailContentRoutes);
contentModuleRoutes.route('/', updateContentRoutes);
contentModuleRoutes.route('/', deleteContentRoutes);
contentModuleRoutes.route('/', transitionContentRoutes);

export * from './singleton';
export * from './reorder';
export * from './list';
export * from './create';
export * from './detail';
export * from './update';
export * from './delete';
export * from './transition';
