import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppBindings } from '@/types/env';
import { listMessagesRoutes } from './list-messages';
import { recordEventRoutes } from './record-event';
import { submitContactRoutes } from './submit-contact';
import { analyticsSummaryRoutes } from './summary';
import { updateMessageRoutes } from './update-message';

export const analyticsModuleRoutes = new OpenAPIHono<AppBindings>({
  defaultHook: (result) => {
    if (!result.success) throw result.error;
  },
});

analyticsModuleRoutes.route('/', analyticsSummaryRoutes);
analyticsModuleRoutes.route('/', listMessagesRoutes);
analyticsModuleRoutes.route('/', updateMessageRoutes);
analyticsModuleRoutes.route('/', recordEventRoutes);
analyticsModuleRoutes.route('/', submitContactRoutes);

export * from './summary';
export * from './list-messages';
export * from './update-message';
export * from './record-event';
export * from './submit-contact';
