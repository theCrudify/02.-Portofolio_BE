import { z } from '@hono/zod-openapi';

export const transitionActionSchema = z.enum(['publish', 'unpublish', 'archive', 'restore']);
export type TransitionActionDto = z.infer<typeof transitionActionSchema>;
