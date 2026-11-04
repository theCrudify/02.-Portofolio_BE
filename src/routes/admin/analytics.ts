import { OpenAPIHono } from '@hono/zod-openapi';
import {
  analyticsSummaryRoutes,
  listMessagesRoutes,
  updateMessageRoutes,
} from '@/modules/analytics';
import type { AppBindings } from '@/types/env';

export const adminAnalytics = new OpenAPIHono<AppBindings>({
  defaultHook: (result) => {
    if (!result.success) throw result.error;
  },
});

adminAnalytics.route('/', analyticsSummaryRoutes);
adminAnalytics.route('/', listMessagesRoutes);
adminAnalytics.route('/', updateMessageRoutes);

export default adminAnalytics;
