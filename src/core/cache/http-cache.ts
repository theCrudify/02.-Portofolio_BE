import type { Context } from 'hono';

export const HTTP_CACHE_HEADER = 'public, s-maxage=300, stale-while-revalidate=86400';

/**
 * Generate a weak ETag based on JSON payload string representation.
 */
export async function generateEtag(data: unknown): Promise<string> {
  const jsonStr = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `W/"${hex}"`;
}

/**
 * Check If-None-Match header against the computed ETag.
 * Returns true if request matches (client has valid cached representation).
 */
export function isNotModified(c: Context, etag: string): boolean {
  const ifNoneMatch = c.req.header('if-none-match');
  if (!ifNoneMatch) {
    return false;
  }

  const cleanEtag = etag.replace(/^W\//, '');
  const cleanHeader = ifNoneMatch.replace(/^W\//, '');

  return cleanEtag === cleanHeader || ifNoneMatch === '*' || ifNoneMatch === etag;
}

