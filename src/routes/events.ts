import { OpenAPIHono } from '@hono/zod-openapi';
import { recordEventRoutes, submitContactRoutes } from '@/modules/analytics';
import type { AppBindings } from '@/types/env';

export const eventsAndContactRoute = new OpenAPIHono<AppBindings>({
  defaultHook: (result) => {
    if (!result.success) throw result.error;
  },
});

eventsAndContactRoute.route('/', recordEventRoutes);
eventsAndContactRoute.route('/', submitContactRoutes);

export default eventsAndContactRoute;
