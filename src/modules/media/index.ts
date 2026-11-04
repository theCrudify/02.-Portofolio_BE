import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppBindings } from '@/types/env';
import { createMediaRoutes } from './create';
import { deleteMediaRoutes } from './delete';
import { detailMediaRoutes } from './detail';
import { embedMediaRoutes } from './embed';
import { listMediaRoutes } from './list';
import { signMediaRoutes } from './sign';
import { updateMediaRoutes } from './update';

export const mediaModuleRoutes = new OpenAPIHono<AppBindings>({
  defaultHook: (result) => {
    if (!result.success) throw result.error;
  },
});

mediaModuleRoutes.route('/', signMediaRoutes);
mediaModuleRoutes.route('/', createMediaRoutes);
mediaModuleRoutes.route('/', embedMediaRoutes);
mediaModuleRoutes.route('/', listMediaRoutes);
mediaModuleRoutes.route('/', detailMediaRoutes);
mediaModuleRoutes.route('/', updateMediaRoutes);
mediaModuleRoutes.route('/', deleteMediaRoutes);

export * from './sign';
export * from './create';
export * from './embed';
export * from './list';
export * from './detail';
export * from './update';
export * from './delete';
