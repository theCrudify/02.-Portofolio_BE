import { z } from '@hono/zod-openapi';

export const logoutModeSchema = z.enum(['single', 'all']).default('single');
export type LogoutMode = z.infer<typeof logoutModeSchema>;
