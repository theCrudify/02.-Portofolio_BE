import { z } from '@hono/zod-openapi';
import { booleanQueryParam, createModuleQuerySchema, flatQueryString } from '@/core/query';

export const listMediaQuerySchema = createModuleQuerySchema({
  kind: z.string().min(1).max(120).regex(/^[a-z0-9_,-]+$/).optional(), // media_kind code(s), comma-separated
  provider: flatQueryString.optional(),
  includeDeleted: booleanQueryParam,
});

export type ListMediaQueryDto = z.infer<typeof listMediaQuerySchema>;
