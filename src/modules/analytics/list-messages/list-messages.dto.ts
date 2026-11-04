import { z } from '@hono/zod-openapi';
import { booleanQueryParam, createModuleQuerySchema } from '@/core/query';

export const listMessagesQuerySchema = createModuleQuerySchema({
  isRead: booleanQueryParam,
  isArchived: booleanQueryParam,
  locale: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/).optional(),
});

export type ListMessagesQueryDto = z.infer<typeof listMessagesQuerySchema>;
