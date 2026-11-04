import { z } from '@hono/zod-openapi';

export const submitContactBodySchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254),
  subject: z.string().max(150).optional().nullable(),
  message: z.string().min(10).max(5000).optional(),
  body: z.string().min(10).max(5000).optional(),
  locale: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/).optional(),
  website: z.string().optional(),
  turnstileToken: z.string().optional(),
});

export type SubmitContactBodyDto = z.infer<typeof submitContactBodySchema>;
