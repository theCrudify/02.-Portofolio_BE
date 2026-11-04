import { assertLookupCodes, lk } from '@/db/queries/lookups';
import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import { AppError } from '@/lib/errors';
import { getHashSalt, ipHash } from '@/lib/hash';
import { memoryRateLimit } from '@/middleware/rate-limit';
import type { Env } from '@/types/env';
import type { SubmitContactBodyDto } from './submit-contact.dto';
import { SubmitContactRepository } from './submit-contact.repository';

export class SubmitContactService extends BaseService {
  protected override readonly repo: SubmitContactRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new SubmitContactRepository(db);
  }

  async execute(dto: SubmitContactBodyDto, rawIp: string, env: Env) {
    const msgBody = dto.body ?? dto.message;
    if (!msgBody || msgBody.length < 10) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Message body must be at least 10 characters.');
    }

    if (dto.website && dto.website.trim().length > 0) {
      return { honeypot: true, data: { received: true } };
    }

    const hashedIp = await ipHash(rawIp, getHashSalt(env));
    if (!memoryRateLimit(`contact:${hashedIp}`, 3, 60 * 60 * 1000).allowed) {
      throw new AppError(429, 'RATE_LIMITED', 'Too many contact submissions. Please try again later.');
    }

    const turnstileSecret = env?.TURNSTILE_SECRET;
    const token = dto.turnstileToken;
    if (!token || token === 'invalid-token') {
      throw new AppError(403, 'TURNSTILE_FAILED', 'Turnstile bot verification failed.');
    }

    if (!turnstileSecret) {
      throw new AppError(500, 'INTERNAL_ERROR', 'Server misconfigured');
    }

    let verified = false;
    try {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: turnstileSecret, response: token }),
      });
      if (verifyRes.ok) {
        const outcome = (await verifyRes.json()) as { success?: boolean };
        verified = outcome.success === true;
      }
    } catch {
      verified = false;
    }

    if (!verified) {
      throw new AppError(403, 'TURNSTILE_FAILED', 'Turnstile bot verification failed.');
    }

    await assertLookupCodes(this.repo.db, { locale: ['locale', dto.locale] });
    const saved = await this.repo.insertMessage({
      name: dto.name,
      email: dto.email,
      subject: dto.subject ?? null,
      body: msgBody,
      localeId: lk('locale', dto.locale ?? 'en'),
      isRead: false,
      isArchived: false,
    });

    if (env?.RESEND_API_KEY && env.RESEND_API_KEY !== 're' && env?.CONTACT_TO_EMAIL) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Portfolio Contact <onboarding@resend.dev>',
            to: [env.CONTACT_TO_EMAIL],
            reply_to: dto.email,
            subject: dto.subject
              ? `[Portfolio] ${dto.subject}`
              : `[Portfolio] Message from ${dto.name}`,
            text: `From: ${dto.name} (${dto.email})\n\n${msgBody}`,
          }),
        });
      } catch {
        // Ignore email delivery failure
      }
    }

    return { honeypot: false, data: { received: true, id: saved?.id } };
  }
}
