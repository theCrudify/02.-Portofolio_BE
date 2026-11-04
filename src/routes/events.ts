import { OpenAPIHono } from '@hono/zod-openapi';
import { getCookie } from 'hono/cookie';
import { z } from 'zod';
import { getDb } from '../db/client';
import { events, messages } from '../db/schema';
import { AppError } from '../lib/errors';
import { getHashSalt, ipHash, visitorHash } from '../lib/hash';
import { ok } from '../lib/response';
import { deviceOf, isBot } from '../lib/ua';
import { SESSION_COOKIE_NAME } from '../middleware/auth';
import { memoryRateLimit } from '../middleware/rate-limit';
import type { AppBindings } from '../types/env';

const eventSchema = z.object({
  type: z.enum([
    'page_view',
    'link_click',
    'cv_download',
    'export_download',
    'share_open',
    'video_play',
  ]),

  path: z.string().min(1).max(300),
  locale: z.enum(['en', 'id']).optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  target: z.string().max(60).optional().nullable(),
  shareLinkId: z.string().uuid().optional().nullable(),
  referrer: z.string().max(300).optional().nullable(),
  utmSource: z.string().max(60).optional().nullable(),
  utmCampaign: z.string().max(60).optional().nullable(),
});

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254),
  subject: z.string().max(150).optional().nullable(),
  message: z.string().min(10).max(5000).optional(),
  body: z.string().min(10).max(5000).optional(),
  locale: z.enum(['en', 'id']).optional(),
  website: z.string().optional(), // Honeypot
  turnstileToken: z.string().optional(),
});

export const eventsAndContactRoute = new OpenAPIHono<AppBindings>();

eventsAndContactRoute.post('/v1/events', async (c) => {
  const ua = c.req.header('user-agent') ?? '';
  const hasAdminCookie = Boolean(getCookie(c, SESSION_COOKIE_NAME));

  // Ignore bots and logged-in admins silently (204)
  if (isBot(ua) || hasAdminCookie) {
    return c.body(null, 204);
  }

  const rawIp =
    c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? '127.0.0.1';
  const hashedIp = await ipHash(rawIp, getHashSalt(c.env));

  if (!memoryRateLimit(`events:${hashedIp}`, 60, 60_000).allowed) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many analytics events.');
  }

  const rawBody = await c.req.json();
  const parsed = eventSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid analytics event payload');
  }

  const utcDate = new Date().toISOString().slice(0, 10);
  const vHash = await visitorHash(rawIp, ua, utcDate, getHashSalt(c.env));

  const country = c.req.header('cf-ipcountry')?.slice(0, 2) ?? null;
  const device = deviceOf(ua);

  const db = getDb(c.env);
  await db.insert(events).values({
    type: parsed.data.type,
    path: parsed.data.path,
    locale: parsed.data.locale ?? null,
    projectId: parsed.data.projectId ?? null,
    target: parsed.data.target ?? null,
    shareLinkId: parsed.data.shareLinkId ?? null,
    visitorHash: vHash,
    country,
    referrer: parsed.data.referrer ?? null,
    utmSource: parsed.data.utmSource ?? null,
    utmCampaign: parsed.data.utmCampaign ?? null,
    device,
  });

  return c.body(null, 204);
});

eventsAndContactRoute.post('/v1/contact', async (c) => {
  const rawBody = await c.req.json();
  const parsed = contactSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Invalid contact form payload',
      parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    );
  }

  const msgBody = parsed.data.body ?? parsed.data.message;
  if (!msgBody || msgBody.length < 10) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Message body must be at least 10 characters.');
  }

  // Honeypot filled -> return 200 OK silently without storing or emailing
  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return ok(c, { received: true });
  }

  const rawIp =
    c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? '127.0.0.1';
  const hashedIp = await ipHash(rawIp, getHashSalt(c.env));

  if (!memoryRateLimit(`contact:${hashedIp}`, 3, 60 * 60 * 1000).allowed) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many contact submissions. Please try again later.');
  }


  // Verify Turnstile token
  const turnstileSecret = c.env?.TURNSTILE_SECRET;
  const token = parsed.data.turnstileToken;
  if (!token || token === 'invalid-token') {
    throw new AppError(403, 'TURNSTILE_FAILED', 'Turnstile bot verification failed.');
  }

  if (!turnstileSecret) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Server misconfigured');
  }
  // Fail closed: any siteverify error counts as a failed check. Cloudflare's test secret
  // (1x0000000000000000000000000000000AA) passes through siteverify, so no local bypass is needed.
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

  const db = getDb(c.env);
  const [saved] = await db
    .insert(messages)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject ?? null,
      body: msgBody,
      locale: parsed.data.locale ?? 'en',
      isRead: false,
      isArchived: false,
    })
    .returning();

  // Optional Resend notification
  if (c.env?.RESEND_API_KEY && c.env.RESEND_API_KEY !== 're' && c.env?.CONTACT_TO_EMAIL) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Portfolio Contact <onboarding@resend.dev>',
          to: [c.env.CONTACT_TO_EMAIL],
          reply_to: parsed.data.email,
          subject: parsed.data.subject
            ? `[Portfolio] ${parsed.data.subject}`
            : `[Portfolio] Message from ${parsed.data.name}`,
          text: `From: ${parsed.data.name} (${parsed.data.email})\n\n${msgBody}`,
        }),
      });
    } catch {
      // Do not fail user request if email delivery fails
    }
  }

  return ok(c, { received: true, id: saved?.id }, undefined, 201);
});
