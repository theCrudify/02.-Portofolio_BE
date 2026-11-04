import { z } from '@hono/zod-openapi';

export const loginBodyDto = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
});

export type LoginBodyDto = z.infer<typeof loginBodyDto>;

export const loginResponseDto = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/),
    totpEnabled: z.boolean(),
    mustEnable2fa: z.boolean(),
  }),
});

export type LoginResponseDto = z.infer<typeof loginResponseDto>;

