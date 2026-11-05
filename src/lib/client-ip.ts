import type { Context } from 'hono';
import type { AppEnv } from '@/types/env';

/**
 * The visitor's IP. Requests arrive through the Vercel proxy, so cf-connecting-ip is
 * Vercel's; the proxy forwards the real one in x-client-ip. That header is only trusted
 * when INTERNAL_API_SECRET is set, because then the internal guard has already proved
 * the request came from our frontend (all callers live under /v1).
 */
export function clientIp(c: Context<AppEnv>): string {
  const forwarded = c.env?.INTERNAL_API_SECRET ? c.req.header('x-client-ip') : undefined;
  return forwarded || c.req.header('cf-connecting-ip') || '127.0.0.1';
}
