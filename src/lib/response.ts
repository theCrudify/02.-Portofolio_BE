import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_STATE'
  | 'UNAUTHENTICATED'
  | 'TOTP_REQUIRED'
  | 'TOTP_INVALID'
  | 'FORBIDDEN'
  | 'CSRF_REJECTED'
  | 'TURNSTILE_FAILED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SHARE_LINK_EXPIRED'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ErrorDetail {
  path: string;
  message: string;
}

export function ok<T, S extends ContentfulStatusCode = 200>(
  c: Context,
  data: T,
  meta?: PaginationMeta,
  status: S = 200 as S,
) {
  if (meta) {
    return c.json({ data, meta }, status);
  }
  return c.json({ data }, status);
}

export function fail<S extends ContentfulStatusCode = ContentfulStatusCode>(
  c: Context,
  status: S,
  code: ErrorCode,
  message: string,
  details?: ErrorDetail[],
) {
  const errorObj: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
  } = {
    code,
    message,
  };
  if (details && details.length > 0) {
    errorObj.details = details;
  }
  return c.json({ error: errorObj }, status);
}
