import { z } from '@hono/zod-openapi';

export const loginBodySchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

export const verify2faBodySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, '2FA code must be 6 digits'),
});

export const enable2faBodySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, '2FA code must be 6 digits'),
});

export const disable2faBodySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, '2FA code must be 6 digits'),
  password: z.string().min(1).max(200),
});

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters long')
    .max(200),
});

export const createUserBodySchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(2).max(100),
  role: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/),
  password: z.string().min(12).max(200).optional(),
});

export const updateUserBodySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  role: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/).optional(),
  isActive: z.boolean().optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

