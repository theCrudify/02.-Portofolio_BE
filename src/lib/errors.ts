import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ErrorCode, ErrorDetail } from '@/lib/response';

export class AppError extends Error {
  public readonly status: ContentfulStatusCode;
  public readonly code: ErrorCode;
  public readonly details?: ErrorDetail[];

  constructor(
    status: ContentfulStatusCode,
    code: ErrorCode,
    message: string,
    details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(
  message: string,
  code: ErrorCode = 'VALIDATION_ERROR',
  details?: ErrorDetail[],
): AppError {
  return new AppError(400, code, message, details);
}

export function invalidState(message = 'Invalid state transition'): AppError {
  return new AppError(400, 'INVALID_STATE', message);
}

export function unauthenticated(
  message = 'Authentication required',
  code: 'UNAUTHENTICATED' | 'TOTP_REQUIRED' | 'TOTP_INVALID' = 'UNAUTHENTICATED',
): AppError {
  return new AppError(401, code, message);
}

export function forbidden(message = 'Insufficient permissions'): AppError {
  return new AppError(403, 'FORBIDDEN', message);
}

export function notFound(message = 'Resource not found'): AppError {
  return new AppError(404, 'NOT_FOUND', message);
}

export function conflict(message = 'Resource conflict'): AppError {
  return new AppError(409, 'CONFLICT', message);
}

export function gone(message = 'Share link expired or inactive'): AppError {
  return new AppError(410, 'SHARE_LINK_EXPIRED', message);
}

export function rateLimited(message = 'Too many requests'): AppError {
  return new AppError(429, 'RATE_LIMITED', message);
}
