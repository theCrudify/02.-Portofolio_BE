import { z } from '@hono/zod-openapi';

export const recordEventBodySchema = z.object({
  type: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/),
  path: z.string().min(1).max(300),
  locale: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/).optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  target: z.string().max(60).optional().nullable(),
  shareLinkId: z.string().uuid().optional().nullable(),
  referrer: z.string().max(300).optional().nullable(),
  utmSource: z.string().max(60).optional().nullable(),
  utmCampaign: z.string().max(60).optional().nullable(),
});

export type RecordEventBodyDto = z.infer<typeof recordEventBodySchema>;
