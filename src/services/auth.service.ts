import { eq } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import * as schema from '@/db/schema';
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  unauthenticated,
} from '@/lib/errors';
import { signPre2faToken, signSession, verifyPre2faToken } from '@/lib/jwt';
import { hashPassword, verifyPassword } from '@/lib/password';
import {
  buildOtpAuthUrl,
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  verifyTotpCode,
} from '@/lib/totp';
import { checkLoginRateLimit, memoryRateLimit } from '@/middleware/rate-limit';
import type { AuthUser, UserRole } from '@/types/env';

export async function writeAuditLog(
  db: DbClient,
  input: {
    userId: string | null;
    action: (typeof schema.auditAction.enumValues)[number];
    resource: string;
    resourceId?: string | null;
    summary?: string;
  },
): Promise<void> {
  await db.insert(schema.auditLogs).values({
    userId: input.userId,
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId ?? null,
    summary: input.summary ?? null,
  });
}

export async function loginWithPassword(
  db: DbClient,
  input: {
    email: string;
    password: string;
    ipHash: string;
    jwtSecret: string;
  },
): Promise<
  | { status: 'authenticated'; sessionToken: string; user: AuthUser }
  | { status: 'totp_required'; pre2faToken: string }
> {
  await checkLoginRateLimit(db, input.ipHash);

  const normalizedEmail = input.email.trim().toLowerCase();
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, normalizedEmail));
  const userRow = rows.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!userRow || !userRow.isActive) {
    await db.insert(schema.loginAttempts).values({
      ipHash: input.ipHash,
      email: normalizedEmail,
      success: false,
    });
    throw unauthenticated('Invalid email or password');
  }

  const validPw = await verifyPassword(input.password, userRow.passwordHash);
  if (!validPw) {
    await db.insert(schema.loginAttempts).values({
      ipHash: input.ipHash,
      email: normalizedEmail,
      success: false,
    });
    throw unauthenticated('Invalid email or password');
  }

  if (userRow.totpEnabled && userRow.totpSecret) {
    const pre2faToken = await signPre2faToken({ sub: userRow.id }, input.jwtSecret);
    return { status: 'totp_required', pre2faToken };
  }

  await db.insert(schema.loginAttempts).values({
    ipHash: input.ipHash,
    email: normalizedEmail,
    success: true,
  });

  await db
    .update(schema.users)
    .set({ lastLoginAt: new Date() })
    .where(eq(schema.users.id, userRow.id));

  await writeAuditLog(db, {
    userId: userRow.id,
    action: 'login',
    resource: 'auth',
    resourceId: userRow.id,
    summary: `User ${userRow.name} logged in`,
  });

  const sessionToken = await signSession(
    { sub: userRow.id, role: userRow.role, tv: userRow.tokenVersion },
    input.jwtSecret,
  );

  return {
    status: 'authenticated',
    sessionToken,
    user: {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      tokenVersion: userRow.tokenVersion,
      totpEnabled: userRow.totpEnabled,
    },
  };
}

export async function verifyLogin2fa(
  db: DbClient,
  input: {
    pre2faToken: string;
    code: string;
    jwtSecret: string;
  },
): Promise<{ sessionToken: string; user: AuthUser }> {
  const rl = memoryRateLimit(`2fa:${input.pre2faToken}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    throw badRequest('Too many 2FA attempts', 'RATE_LIMITED');
  }

  const payload = await verifyPre2faToken(input.pre2faToken, input.jwtSecret);
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, payload.sub));
  const userRow = rows.find((u) => u.id === payload.sub);

  if (!userRow || !userRow.isActive || !userRow.totpSecret) {
    throw unauthenticated('Invalid 2FA session');
  }

  const plainSecret = await decryptTotpSecret(userRow.totpSecret, input.jwtSecret);
  const isValidCode = await verifyTotpCode(plainSecret, input.code);
  if (!isValidCode) {
    throw unauthenticated('Invalid 2FA verification code', 'TOTP_INVALID');
  }

  await db
    .update(schema.users)
    .set({ lastLoginAt: new Date() })
    .where(eq(schema.users.id, userRow.id));

  await writeAuditLog(db, {
    userId: userRow.id,
    action: 'login',
    resource: 'auth',
    resourceId: userRow.id,
    summary: `User ${userRow.name} logged in with 2FA`,
  });

  const sessionToken = await signSession(
    { sub: userRow.id, role: userRow.role, tv: userRow.tokenVersion },
    input.jwtSecret,
  );

  return {
    sessionToken,
    user: {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      tokenVersion: userRow.tokenVersion,
      totpEnabled: userRow.totpEnabled,
    },
  };
}

export async function setup2faForUser(
  db: DbClient,
  user: AuthUser,
  jwtSecret: string,
): Promise<{ secret: string; otpauthUrl: string }> {
  const secret = generateTotpSecret();
  const encrypted = await encryptTotpSecret(secret, jwtSecret);

  await db
    .update(schema.users)
    .set({ totpSecret: encrypted, totpEnabled: false })
    .where(eq(schema.users.id, user.id));

  const otpauthUrl = buildOtpAuthUrl(user.email, secret, 'Portfolio');
  return { secret, otpauthUrl };
}

export async function enable2faForUser(
  db: DbClient,
  user: AuthUser,
  code: string,
  jwtSecret: string,
): Promise<void> {
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, user.id));
  const userRow = rows.find((u) => u.id === user.id);

  if (!userRow || !userRow.totpSecret) {
    throw badRequest('2FA setup has not been initialized');
  }

  const secret = await decryptTotpSecret(userRow.totpSecret, jwtSecret);
  const valid = await verifyTotpCode(secret, code);
  if (!valid) {
    throw unauthenticated('Invalid 2FA verification code', 'TOTP_INVALID');
  }

  await db
    .update(schema.users)
    .set({ totpEnabled: true })
    .where(eq(schema.users.id, user.id));

  await writeAuditLog(db, {
    userId: user.id,
    action: 'settings',
    resource: 'users',
    resourceId: user.id,
    summary: 'Enabled 2FA TOTP',
  });
}

export async function disable2faForUser(
  db: DbClient,
  user: AuthUser,
  input: { code: string; password: string; jwtSecret: string },
): Promise<void> {
  if (user.role === 'owner') {
    throw forbidden('Owner accounts cannot disable 2FA');
  }

  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, user.id));
  const userRow = rows.find((u) => u.id === user.id);

  if (!userRow || !userRow.totpSecret || !userRow.totpEnabled) {
    throw badRequest('2FA is not currently enabled');
  }

  const pwOk = await verifyPassword(input.password, userRow.passwordHash);
  if (!pwOk) {
    throw unauthenticated('Invalid password');
  }

  const secret = await decryptTotpSecret(userRow.totpSecret, input.jwtSecret);
  const codeOk = await verifyTotpCode(secret, input.code);
  if (!codeOk) {
    throw unauthenticated('Invalid 2FA verification code', 'TOTP_INVALID');
  }

  await db
    .update(schema.users)
    .set({ totpEnabled: false, totpSecret: null })
    .where(eq(schema.users.id, user.id));

  await writeAuditLog(db, {
    userId: user.id,
    action: 'settings',
    resource: 'users',
    resourceId: user.id,
    summary: 'Disabled 2FA TOTP',
  });
}

export async function logoutAllDevices(db: DbClient, user: AuthUser): Promise<void> {
  await db
    .update(schema.users)
    .set({ tokenVersion: user.tokenVersion + 1 })
    .where(eq(schema.users.id, user.id));

  await writeAuditLog(db, {
    userId: user.id,
    action: 'logout',
    resource: 'auth',
    resourceId: user.id,
    summary: 'Logged out of all devices',
  });
}

export async function changeUserPassword(
  db: DbClient,
  user: AuthUser,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, user.id));
  const userRow = rows.find((u) => u.id === user.id);
  if (!userRow) {
    throw notFound('User not found');
  }

  const validPw = await verifyPassword(input.currentPassword, userRow.passwordHash);
  if (!validPw) {
    throw unauthenticated('Current password is incorrect');
  }

  const newHash = await hashPassword(input.newPassword);
  await db
    .update(schema.users)
    .set({
      passwordHash: newHash,
      tokenVersion: userRow.tokenVersion + 1,
    })
    .where(eq(schema.users.id, user.id));

  await writeAuditLog(db, {
    userId: user.id,
    action: 'settings',
    resource: 'users',
    resourceId: user.id,
    summary: 'Changed account password',
  });
}

function generateInitialPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let pw = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    pw += chars[(bytes[i] ?? 0) % chars.length];
  }
  return pw;
}

export async function listUsers(db: DbClient) {
  const rows = await db.select().from(schema.users);
  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    totpEnabled: u.totpEnabled,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
    createdAt: new Date(u.createdAt).toISOString(),
  }));
}

export async function createUserAccount(
  db: DbClient,
  actor: AuthUser,
  input: { email: string; name: string; role: UserRole; password?: string },
) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await db.select().from(schema.users);
  if (existing.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw conflict('Email is already registered');
  }

  const initialPassword = input.password ?? generateInitialPassword();
  const passwordHash = await hashPassword(initialPassword);

  const inserted = await db
    .insert(schema.users)
    .values({
      email: normalizedEmail,
      name: input.name,
      role: input.role,
      passwordHash,
      isActive: true,
    })
    .returning();

  const created = inserted[0]!;
  await writeAuditLog(db, {
    userId: actor.id,
    action: 'create',
    resource: 'users',
    resourceId: created.id,
    summary: `Created user ${created.email} (${created.role})`,
  });

  return {
    user: {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
      isActive: created.isActive,
    },
    initialPassword,
  };
}

export async function updateUserAccount(
  db: DbClient,
  actor: AuthUser,
  targetId: string,
  input: { name?: string; role?: UserRole; isActive?: boolean },
) {
  const allUsers = await db.select().from(schema.users);
  const target = allUsers.find((u) => u.id === targetId);
  if (!target) {
    throw notFound('User not found');
  }

  if (actor.id === targetId) {
    if (input.isActive === false) {
      throw forbidden('Cannot deactivate your own account');
    }
    if (input.role && input.role !== target.role) {
      throw forbidden('Cannot change your own role');
    }
  }

  // Ensure at least one active owner remains
  const activeOwners = allUsers.filter((u) => u.role === 'owner' && u.isActive);
  if (
    target.role === 'owner' &&
    target.isActive &&
    activeOwners.length <= 1 &&
    (input.role !== undefined && input.role !== 'owner' || input.isActive === false)
  ) {
    throw forbidden('At least one active owner account is required');
  }

  const nextTokenVersion =
    input.role !== undefined || input.isActive === false
      ? target.tokenVersion + 1
      : target.tokenVersion;

  await db
    .update(schema.users)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      tokenVersion: nextTokenVersion,
    })
    .where(eq(schema.users.id, targetId));

  await writeAuditLog(db, {
    userId: actor.id,
    action: 'update',
    resource: 'users',
    resourceId: targetId,
    summary: `Updated user ${target.email}`,
  });

  return {
    id: target.id,
    email: target.email,
    name: input.name ?? target.name,
    role: input.role ?? target.role,
    isActive: input.isActive ?? target.isActive,
  };
}

export async function deleteUserAccount(
  db: DbClient,
  actor: AuthUser,
  targetId: string,
): Promise<void> {
  if (actor.id === targetId) {
    throw forbidden('Cannot delete your own account');
  }

  const allUsers = await db.select().from(schema.users);
  const target = allUsers.find((u) => u.id === targetId);
  if (!target) {
    throw notFound('User not found');
  }

  const activeOwners = allUsers.filter((u) => u.role === 'owner' && u.isActive);
  if (target.role === 'owner' && target.isActive && activeOwners.length <= 1) {
    throw forbidden('At least one active owner account is required');
  }

  await db.delete(schema.users).where(eq(schema.users.id, targetId));

  await writeAuditLog(db, {
    userId: actor.id,
    action: 'delete',
    resource: 'users',
    resourceId: targetId,
    summary: `Deleted user ${target.email}`,
  });
}

