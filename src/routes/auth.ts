import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { getDb } from '@/db/client';
import { AppError, unauthenticated } from '@/lib/errors';
import { ipHash } from '@/lib/hash';
import { fail, ok } from '@/lib/response';
import {
  PRE_2FA_COOKIE_NAME,
  requireAuth,
  SESSION_COOKIE_NAME,
} from '@/middleware/auth';
import {
  changeUserPassword,
  disable2faForUser,
  enable2faForUser,
  loginWithPassword,
  logoutAllDevices,
  setup2faForUser,
  verifyLogin2fa,
  writeAuditLog,
} from '@/services/auth.service';
import type { AppEnv } from '@/types/env';
import {
  changePasswordBodySchema,
  disable2faBodySchema,
  enable2faBodySchema,
  loginBodySchema,
  verify2faBodySchema,
} from '@/validators/auth';

export const authRoute = new OpenAPIHono<AppEnv>({
  defaultHook: (result) => {
    if (!result.success) {
      throw result.error;
    }
  },
});

const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60;
const FIVE_MINUTES_SEC = 5 * 60;

const postLoginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Auth'],
  summary: 'Authenticate user with email and password',
  request: {
    body: {
      content: {
        'application/json': { schema: loginBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Authenticated session',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
    401: { description: 'Invalid credentials or TOTP required' },
    429: { description: 'Too many failed login attempts' },
  },
});

authRoute.openapi(postLoginRoute, async (c) => {
  const { email, password } = c.req.valid('json');
  const db = getDb(c.env);
  const clientIp = c.req.header('cf-connecting-ip') || '127.0.0.1';
  const salt = c.env?.HASH_SALT || 'dev-hash-salt';
  const jwtSecret = c.env?.JWT_SECRET || 'dev-jwt-secret-min-32-chars-long';
  const hashedIp = await ipHash(clientIp, salt);

  try {
    const result = await loginWithPassword(db, {
      email,
      password,
      ipHash: hashedIp,
      jwtSecret,
    });

    if (result.status === 'totp_required') {
      setCookie(c, PRE_2FA_COOKIE_NAME, result.pre2faToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        path: '/',
        maxAge: FIVE_MINUTES_SEC,
      });
      return fail(c, 401, 'TOTP_REQUIRED', 'Two-factor authentication code is required');
    }

    setCookie(c, SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: SEVEN_DAYS_SEC,
    });

    return ok(c, {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        totpEnabled: result.user.totpEnabled,
        mustEnable2fa: result.user.role === 'owner' && !result.user.totpEnabled,
      },
    });
  } catch (err) {
    if (err instanceof AppError && err.status === 429) {
      c.header('Retry-After', '900');
    }
    throw err;
  }
});

const post2faVerifyRoute = createRoute({
  method: 'post',
  path: '/2fa/verify',
  tags: ['Auth'],
  summary: 'Verify 2FA TOTP code to complete login',
  request: {
    body: {
      content: {
        'application/json': { schema: verify2faBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Authenticated session',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
    401: { description: 'Invalid 2FA code' },
  },
});

authRoute.openapi(post2faVerifyRoute, async (c) => {
  const { code } = c.req.valid('json');
  const pre2faToken = getCookie(c, PRE_2FA_COOKIE_NAME);
  if (!pre2faToken) {
    throw unauthenticated('Missing 2FA session cookie');
  }

  const db = getDb(c.env);
  const jwtSecret = c.env?.JWT_SECRET || 'dev-jwt-secret-min-32-chars-long';
  const result = await verifyLogin2fa(db, {
    pre2faToken,
    code,
    jwtSecret,
  });

  deleteCookie(c, PRE_2FA_COOKIE_NAME, { path: '/' });
  setCookie(c, SESSION_COOKIE_NAME, result.sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SEVEN_DAYS_SEC,
  });

  return ok(c, {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      totpEnabled: result.user.totpEnabled,
      mustEnable2fa: false,
    },
  });
});

authRoute.post('/logout', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env);
  await writeAuditLog(db, {
    userId: user.id,
    action: 'logout',
    resource: 'auth',
    resourceId: user.id,
    summary: `User ${user.name} logged out`,
  });
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
  return c.body(null, 204);
});

authRoute.post('/logout-all', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env);
  await logoutAllDevices(db, user);
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
  return c.body(null, 204);
});

authRoute.get('/me', requireAuth, (c) => {
  const user = c.get('user')!;
  return ok(c, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    totpEnabled: user.totpEnabled,
    mustEnable2fa: user.role === 'owner' && !user.totpEnabled,
  });
});

authRoute.post('/2fa/setup', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env);
  const jwtSecret = c.env?.JWT_SECRET || 'dev-jwt-secret-min-32-chars-long';
  const result = await setup2faForUser(db, user, jwtSecret);
  return ok(c, result);
});

authRoute.post('/2fa/enable', requireAuth, async (c) => {
  const body = enable2faBodySchema.parse(await c.req.json());
  const user = c.get('user')!;
  const db = getDb(c.env);
  const jwtSecret = c.env?.JWT_SECRET || 'dev-jwt-secret-min-32-chars-long';
  await enable2faForUser(db, user, body.code, jwtSecret);
  return ok(c, { ok: true });
});

authRoute.post('/2fa/disable', requireAuth, async (c) => {
  const body = disable2faBodySchema.parse(await c.req.json());
  const user = c.get('user')!;
  const db = getDb(c.env);
  const jwtSecret = c.env?.JWT_SECRET || 'dev-jwt-secret-min-32-chars-long';
  await disable2faForUser(db, user, {
    code: body.code,
    password: body.password,
    jwtSecret,
  });
  return ok(c, { ok: true });
});

authRoute.post('/password', requireAuth, async (c) => {
  const body = changePasswordBodySchema.parse(await c.req.json());
  const user = c.get('user')!;
  const db = getDb(c.env);
  await changeUserPassword(db, user, body);
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
  return c.body(null, 204);
});

