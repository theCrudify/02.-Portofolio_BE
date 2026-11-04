import type { Env } from '../types/env';

export async function revalidate(env: Env, tags: string[]): Promise<void> {
  if (!env.FRONTEND_URL || !env.REVALIDATE_SECRET) {
    return;
  }
  try {
    await fetch(`${env.FRONTEND_URL.replace(/\/$/, '')}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': env.REVALIDATE_SECRET,
      },
      body: JSON.stringify({ tags }),
    });
  } catch (err) {
    console.warn('Revalidate webhook warning:', err);
  }
}
