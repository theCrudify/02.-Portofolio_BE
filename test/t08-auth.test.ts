import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { app } from '@/index';
import { setTestDb, type DbClient } from '@/db/client';
import { lk } from '@/db/queries/lookups';
import * as schema from '@/db/schema';
import { ipHash, visitorHash } from '@/lib/hash';
import { signSession, verifySession } from '@/lib/jwt';
import { hashPassword } from '@/lib/password';
import { generateTotpCode } from '@/lib/totp';
import { clearMemoryRateLimits } from '@/middleware/rate-limit';
import { useTestDb } from './helpers/db';

function extractCookie(res: Response, cookieName: string): string | null {
  const header = res.headers.get('set-cookie');
  if (!header) return null;
  const match = new RegExp(`${cookieName}=([^;]+)`).exec(header);
  return match?.[1] ?? null;
}

describe('T08 · Authentication, 2FA TOTP, JWT Session, Rate Limit & Role Gate', () => {
  let db: DbClient;
  const ownerId = '01950000-0000-7000-8000-000000000001';
  const editorId = '01950000-0000-7000-8000-000000000002';
  const jwtSecret = 'dev-jwt-secret-min-32-chars-long';
  const env = {
    JWT_SECRET: jwtSecret,
    HASH_SALT: 'salt',
    FRONTEND_URL: 'http://localhost:3000',
  };
  const request = (path: string, init: RequestInit) => app.request(path, init, env);

  beforeEach(async () => {
    clearMemoryRateLimits();
    const ownerPwHash = await hashPassword('OwnerSecurePass123!');
    const editorPwHash = await hashPassword('EditorSecurePass123!');

    db = await useTestDb();
    await db.insert(schema.users).values([
      {
        id: ownerId,
        email: 'owner@example.com',
        name: 'Owner User',
        passwordHash: ownerPwHash,
        roleId: lk('user_role', 'owner'),
      },
      {
        id: editorId,
        email: 'editor@example.com',
        name: 'Editor User',
        passwordHash: editorPwHash,
        roleId: lk('user_role', 'editor'),
      },
    ]);
  });

  afterEach(() => {
    setTestDb(null);
  });

  it('computes deterministic SHA-256 ipHash and daily rotating visitorHash', async () => {
    const h1 = await ipHash('1.2.3.4', 'salt-1');
    const h2 = await ipHash('1.2.3.4', 'salt-1');
    expect(h1).toHaveLength(64);
    expect(h1).toBe(h2);

    const vDay1 = await visitorHash('1.2.3.4', 'Mozilla/5.0', '2026-05-01', 'salt-1');
    const vDay2 = await visitorHash('1.2.3.4', 'Mozilla/5.0', '2026-05-02', 'salt-1');
    expect(vDay1).not.toBe(vDay2);
  });

  it('rejects expired JWT tokens', async () => {
    const expiredToken = await signSession(
      { sub: ownerId, role: 'owner', tv: 0 },
      jwtSecret,
      -10,
    );
    await expect(verifySession(expiredToken, jwtSecret)).rejects.toThrow();
  });

  it('blocks 6th failed login attempt within 15 minutes with 429 RATE_LIMITED', async () => {
    for (let i = 1; i <= 5; i++) {
      const res = await request('/v1/auth/login', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '203.0.113.99',
        },
        body: JSON.stringify({
          email: 'owner@example.com',
          password: 'WrongPassword!',
        }),
      });
      expect(res.status).toBe(401);
    }

    const sixthRes = await request('/v1/auth/login', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '203.0.113.99',
      },
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'OwnerSecurePass123!',
      }),
    });

    expect(sixthRes.status).toBe(429);
    expect(sixthRes.headers.get('retry-after')).toBe('900');
  });

  it('completes login, 2FA setup & enable, 2FA login challenge, and blocks owner from disabling 2FA', async () => {
    // 1. Login without 2FA
    const loginRes = await request('/v1/auth/login', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'OwnerSecurePass123!',
      }),
    });
    expect(loginRes.status).toBe(200);
    const sessionCookie = extractCookie(loginRes, 'pf_session');
    expect(sessionCookie).toBeTruthy();

    // 2. Setup 2FA
    const setupRes = await request('/v1/auth/2fa/setup', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        Cookie: `pf_session=${sessionCookie}`,
      },
    });
    expect(setupRes.status).toBe(200);
    const setupJson = await setupRes.json<{ data: { secret: string; otpauthUrl: string } }>();
    expect(setupJson.data.otpauthUrl).toContain('otpauth://totp/');

    // 3. Enable 2FA with valid TOTP code
    const code = await generateTotpCode(setupJson.data.secret);
    const enableRes = await request('/v1/auth/2fa/enable', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
        Cookie: `pf_session=${sessionCookie}`,
      },
      body: JSON.stringify({ code }),
    });
    expect(enableRes.status).toBe(200);

    // 4. Owner cannot disable 2FA
    const disableRes = await request('/v1/auth/2fa/disable', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
        Cookie: `pf_session=${sessionCookie}`,
      },
      body: JSON.stringify({ code, password: 'OwnerSecurePass123!' }),
    });
    expect(disableRes.status).toBe(403);

    // 5. Next login requires TOTP (401 TOTP_REQUIRED + pf_2fa cookie)
    const challengeRes = await request('/v1/auth/login', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'OwnerSecurePass123!',
      }),
    });
    expect(challengeRes.status).toBe(401);
    const challengeJson = await challengeRes.json<{ error: { code: string } }>();
    expect(challengeJson.error.code).toBe('TOTP_REQUIRED');
    const pre2faCookie = extractCookie(challengeRes, 'pf_2fa');
    expect(pre2faCookie).toBeTruthy();

    // 6. Verify 2FA completes login
    const verifyRes = await request('/v1/auth/2fa/verify', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
        Cookie: `pf_2fa=${pre2faCookie}`,
      },
      body: JSON.stringify({ code }),
    });
    expect(verifyRes.status).toBe(200);
    expect(extractCookie(verifyRes, 'pf_session')).toBeTruthy();
  });

  it('invalidates previous session when logout-all increments token_version', async () => {
    const token = await signSession({ sub: ownerId, role: 'owner', tv: 0 }, jwtSecret);

    const meBefore = await request('/v1/auth/me', {
      headers: { Cookie: `pf_session=${token}` },
    });
    expect(meBefore.status).toBe(200);

    const logoutAllRes = await request('/v1/auth/logout-all', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        Cookie: `pf_session=${token}`,
      },
    });
    expect(logoutAllRes.status).toBe(204);
    const [owner] = await db.select().from(schema.users).where(eq(schema.users.id, ownerId));
    expect(owner!.tokenVersion).toBe(1);

    // Old token has tv=0, user in DB now has tokenVersion=1 -> rejected with 401
    const meAfter = await request('/v1/auth/me', {
      headers: { Cookie: `pf_session=${token}` },
    });
    expect(meAfter.status).toBe(401);
  });

  it('enforces role hierarchy: editor gets 403 FORBIDDEN on owner-only /v1/admin/users', async () => {
    const editorToken = await signSession({ sub: editorId, role: 'editor', tv: 0 }, jwtSecret);
    const ownerToken = await signSession({ sub: ownerId, role: 'owner', tv: 0 }, jwtSecret);

    const editorRes = await request('/v1/admin/users', {
      headers: { Cookie: `pf_session=${editorToken}` },
    });
    expect(editorRes.status).toBe(403);

    const ownerRes = await request('/v1/admin/users', {
      headers: { Cookie: `pf_session=${ownerToken}` },
    });
    expect(ownerRes.status).toBe(200);
    const list = await ownerRes.json<{ data: { email: string; role: string }[] }>();
    expect(list.data.map((u) => [u.email, u.role]).sort()).toEqual([
      ['editor@example.com', 'editor'],
      ['owner@example.com', 'owner'],
    ]);
  });

  it('creates users with a known role code and rejects an unknown one with 400', async () => {
    const ownerToken = await signSession({ sub: ownerId, role: 'owner', tv: 0 }, jwtSecret);
    const create = (role: string, email: string) =>
      request('/v1/admin/users', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          Cookie: `pf_session=${ownerToken}`,
        },
        body: JSON.stringify({ email, name: 'New User', role }),
      });

    const bad = await create('superadmin', 'bad@example.com');
    expect(bad.status).toBe(400);
    const badJson = await bad.json<{ error: { code: string } }>();
    expect(badJson.error.code).toBe('VALIDATION_ERROR');
    expect(await db.$count(schema.users, eq(schema.users.email, 'bad@example.com'))).toBe(0);

    const ok = await create('viewer', 'viewer@example.com');
    expect(ok.status).toBe(201);
    const [created] = await db
      .select({ role: schema.lookups.code })
      .from(schema.users)
      .innerJoin(schema.lookups, eq(schema.lookups.id, schema.users.roleId))
      .where(eq(schema.users.email, 'viewer@example.com'));
    expect(created!.role).toBe('viewer');
  });
});

