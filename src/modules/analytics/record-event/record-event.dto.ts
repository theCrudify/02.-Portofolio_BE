import { z } from '@hono/zod-openapi';

export const recordEventBodySchema = z.object({
  type: z.enum([
    'page_view',
    'link_click',
    'cv_download',
    'export_download',
    'share_open',
    'video_play',
  ]),
  path: z.string().min(1).max(300),
  locale: z.enum(['en', 'id']).optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  target: z.string().max(60).optional().nullable(),
  shareLinkId: z.string().uuid().optional().nullable(),
  referrer: z.string().max(300).optional().nullable(),
  utmSource: z.string().max(60).optional().nullable(),
  utmCampaign: z.string().max(60).optional().nullable(),
});

export type RecordEventBodyDto = z.infer<typeof recordEventBodySchema>;
