import { sign, verify } from 'hono/jwt';
import { AppError, unauthenticated } from '@/lib/errors';
import type { UserRole } from '@/types/env';

// No fallback: a default secret would let anyone forge sessions if the env var is missing.
export function getJwtSecret(env: { JWT_SECRET?: string } | undefined): string {
  const secret = env?.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Server misconfigured');
  }
  return secret;
}

export interface SessionJwtPayload {
  sub: string;
  role: UserRole;
  tv: number;
  iat: number;
  exp: number;
}

export interface Pre2faJwtPayload {
  sub: string;
  purpose: '2fa';
  iat: number;
  exp: number;
}

const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60;
const FIVE_MINUTES_SEC = 5 * 60;

export async function signSession(
  input: { sub: string; role: UserRole; tv: number },
  secret: string,
  ttlSeconds = SEVEN_DAYS_SEC,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      sub: input.sub,
      role: input.role,
      tv: input.tv,
      iat: now,
      exp: now + ttlSeconds,
    },
    secret,
    'HS256',
  );
}

export async function verifySession(
  token: string,
  secret: string,
): Promise<SessionJwtPayload> {
  try {
    const payload = await verify(token, secret, 'HS256');
    if (
      typeof payload.sub !== 'string' ||
      (payload.role !== 'owner' && payload.role !== 'editor' && payload.role !== 'viewer') ||
      typeof payload.tv !== 'number'
    ) {
      throw unauthenticated('Invalid session token payload');
    }
    return {
      sub: payload.sub,
      role: payload.role,
      tv: payload.tv,
      iat: Number(payload.iat ?? 0),
      exp: Number(payload.exp ?? 0),
    };
  } catch {
    throw unauthenticated('Invalid or expired session token');
  }
}

export async function signPre2faToken(
  input: { sub: string },
  secret: string,
  ttlSeconds = FIVE_MINUTES_SEC,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      sub: input.sub,
      purpose: '2fa',
      iat: now,
      exp: now + ttlSeconds,
    },
    secret,
    'HS256',
  );
}

export async function verifyPre2faToken(
  token: string,
  secret: string,
): Promise<Pre2faJwtPayload> {
  try {
    const payload = await verify(token, secret, 'HS256');
    if (typeof payload.sub !== 'string' || payload.purpose !== '2fa') {
      throw unauthenticated('Invalid 2FA token');
    }
    return {
      sub: payload.sub,
      purpose: '2fa',
      iat: Number(payload.iat ?? 0),
      exp: Number(payload.exp ?? 0),
    };
  } catch {
    throw unauthenticated('Invalid or expired 2FA session');
  }
}

