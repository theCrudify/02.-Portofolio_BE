import type { ErrorHandler, NotFoundHandler } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '@/lib/errors';
import { fail } from '@/lib/response';
import type { AppEnv } from '@/types/env';

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof AppError) {
    return fail(c, err.status, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    const firstMessage = details[0]?.message ?? 'Validation error';
    return fail(c, 400, 'VALIDATION_ERROR', firstMessage, details);
  }

  console.error('[Unhandled Error]', {
    requestId: c.get('requestId'),
    message: err instanceof Error ? err.message : String(err),
  });

  return fail(c, 500, 'INTERNAL_ERROR', 'An unexpected internal error occurred');
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) => {
  return fail(c, 404, 'NOT_FOUND', `Route ${c.req.method} ${c.req.path} not found`);
};

