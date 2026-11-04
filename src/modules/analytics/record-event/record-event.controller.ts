import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { BaseController } from '@/core/base';
import { AppError } from '@/lib/errors';
import { getHashSalt, ipHash } from '@/lib/hash';
import { isBot } from '@/lib/ua';
import { SESSION_COOKIE_NAME } from '@/middleware/auth';
import { memoryRateLimit } from '@/middleware/rate-limit';
import { recordEventBodySchema } from './record-event.dto';
import { RecordEventService } from './record-event.service';

export class RecordEventController extends BaseController {
  handle = async (c: Context) => {
    const ua = c.req.header('user-agent') ?? '';
    const hasAdminCookie = Boolean(getCookie(c, SESSION_COOKIE_NAME));

    if (isBot(ua) || hasAdminCookie) {
      return this.noContent(c);
    }

    const rawIp =
      c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? '127.0.0.1';
    const hashedIp = await ipHash(rawIp, getHashSalt(c.env));

    if (!memoryRateLimit(`events:${hashedIp}`, 60, 60_000).allowed) {
      throw new AppError(429, 'RATE_LIMITED', 'Too many analytics events.');
    }

    const dto = await this.parseBody(c, recordEventBodySchema, 'Invalid analytics event payload');
    const country = c.req.header('cf-ipcountry')?.slice(0, 2) ?? null;

    const service = new RecordEventService(this.getDb(c));
    await service.execute(dto, rawIp, ua, country, c.env);

    return this.noContent(c);
  };
}
