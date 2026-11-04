import { z } from '@hono/zod-openapi';
import { booleanQueryParam, createModuleQuerySchema } from '@/core/query';

export const listUsersQueryDto = createModuleQuerySchema({
  role: z.enum(['owner', 'editor', 'viewer']).optional(),
  isActive: booleanQueryParam.optional(),
  totpEnabled: booleanQueryParam.optional(),
});

export type ListUsersQueryDto = z.infer<typeof listUsersQueryDto>;

export interface UserListItemDto {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
  totpEnabled: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
