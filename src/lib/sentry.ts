import type { Env } from '../types/env';

export async function reportErrorToSentry(
  err: unknown,
  env: Env,
  context?: Record<string, unknown>
): Promise<void> {
  if (!env.SENTRY_DSN) return;

  try {
    const dsnUrl = new URL(env.SENTRY_DSN);
    const publicKey = dsnUrl.username;
    const projectId = dsnUrl.pathname.replace(/^\//, '');
    const storeEndpoint = `${dsnUrl.protocol}//${dsnUrl.host}/api/${projectId}/store/?sentry_key=${publicKey}&sentry_version=7`;

    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    await fetch(storeEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        platform: 'javascript',
        level: 'error',
        extra: {
          stack,
          ...context,
        },
        timestamp: Date.now() / 1000,
      }),
    });
  } catch {
    // Fail silently if Sentry reporting fails
  }
}
