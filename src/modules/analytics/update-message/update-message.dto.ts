import { z } from '@hono/zod-openapi';

export const updateMessageBodySchema = z.object({
  isRead: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export type UpdateMessageBodyDto = z.infer<typeof updateMessageBodySchema>;
