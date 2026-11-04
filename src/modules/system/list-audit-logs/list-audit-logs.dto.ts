import { z } from '@hono/zod-openapi';
import { createModuleQuerySchema, flatQueryString } from '@/core/query';

export const listAuditLogsQuerySchema = createModuleQuerySchema({
  action: flatQueryString.optional(),
  resource: flatQueryString.optional(),
  userId: flatQueryString.optional(),
});

export type ListAuditLogsQueryDto = z.infer<typeof listAuditLogsQuerySchema>;
