import { z } from '@hono/zod-openapi';
import { booleanQueryParam, createModuleQuerySchema } from '@/core/query';

export const listMessagesQuerySchema = createModuleQuerySchema({
  isRead: booleanQueryParam,
  isArchived: booleanQueryParam,
  locale: z.enum(['en', 'id']).optional(),
});

export type ListMessagesQueryDto = z.infer<typeof listMessagesQuerySchema>;
