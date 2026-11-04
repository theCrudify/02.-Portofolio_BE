import { z } from '@hono/zod-openapi';
import { flatQueryString } from '@/core/query';

export const analyticsSummaryQuerySchema = z.object({
  range: flatQueryString.optional(),
});

export type AnalyticsSummaryQueryDto = z.infer<typeof analyticsSummaryQuerySchema>;
