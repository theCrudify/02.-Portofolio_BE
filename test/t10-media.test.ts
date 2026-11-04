import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { app } from '@/index';
import { setTestDb, type DbClient } from '@/db/client';
import { signCloudinaryParams } from '@/lib/cloudinary';
import { signSession } from '@/lib/jwt';
import { parseVideoUrl } from '@/lib/oembed';

interface MediaStore {
  users: Record<string, unknown>[];
  media: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  audit_logs: Record<string, unknown>[];
  [key: string]: Record<string, unknown>[];
}

function createMediaMockDb(store: MediaStore): DbClient {
  const buildChain = (rows: Record<string, unknown>[]) => {
    const chain: Record<string, unknown> = {
      where: () => buildChain(rows),
      orderBy: () => buildChain(rows),
      limit: (n: number) => buildChain(rows.slice(0, n)),
      offset: (o: number) => buildChain(rows.slice(o)),
      then: (
        resolve: (val: Record<string, unknown>[]) => unknown,
        reject?: (err: unknown) => unknown
      ) => Promise.resolve(rows).then(resolve, reject),
    };
    return chain;
  };

  return {
    select: () => ({
      from: (table: unknown) => {
        const name = getTableName(table as Parameters<typeof getTableName>[0]);
        return buildChain(store[name] ?? []);
      },
    }),
    insert: (table: unknown) => ({
      values: (val: Record<string, unknown>) => {
        const name = getTableName(table as Parameters<typeof getTableName>[0]);
        store[name] = store[name] ?? [];
        const row = {
          id: (val.id as string | undefined) ?? uuidv7(),
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          ...val,
        };
        store[name]!.push(row);
        return Object.assign(Promise.resolve([row]), {
          returning: () => Promise.resolve([row]),
        });
      },
    }),
    update: (table: unknown) => ({
      set: (patch: Record<string, unknown>) => ({
        where: () => {
          const name = getTableName(table as Parameters<typeof getTableName>[0]);
          const rows = store[name] ?? [];
          const target = rows[rows.length - 1];
          if (target) Object.assign(target, patch);
          return Object.assign(Promise.resolve([target]), {
            returning: () => Promise.resolve([target]),
          });
        },
      }),
    }),
  } as unknown as DbClient;
}

describe('T10 · Media Library, Cloudinary Signature, Video Embed & 409 Usage Protection', () => {
  const jwtSecret = 'dev-jwt-secret-min-32-chars-long';
  const ownerId = '01950000-0000-7000-8000-000000000001';
  let store: MediaStore;
  let ownerCookie: string;

  beforeEach(async () => {
    store = {
      users: [
        {
          id: ownerId,
          email: 'owner@example.com',
          name: 'Owner',
          role: 'owner',
          tokenVersion: 0,
          totpEnabled: false,
          isActive: true,
        },
      ],
      media: [],
      projects: [],
      audit_logs: [],
    };
    setTestDb(createMediaMockDb(store));
    const token = await signSession({ sub: ownerId, role: 'owner', tv: 0 }, jwtSecret);
    ownerCookie = `pf_session=${token}`;
  });

  afterEach(() => {
    setTestDb(null);
  });

  const env = {
    DATABASE_URL: 'postgres://localhost/test',
    JWT_SECRET: jwtSecret,
    HASH_SALT: 'salt',
    FRONTEND_URL: 'http://localhost:3000',
    REVALIDATE_SECRET: 'rev',
    TURNSTILE_SECRET: 'ts',
    CLOUDINARY_CLOUD_NAME: 'my-cloud',
    CLOUDINARY_API_KEY: 'my-key',
    CLOUDINARY_API_SECRET: 'my-secret-123',
    RESEND_API_KEY: 're',
    CONTACT_TO_EMAIL: 'me@example.com',
  };

  it('generates deterministic Cloudinary SHA-1 upload signature and folder/limits per kind', async () => {
    const res = await app.request(
      '/v1/admin/media/sign',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
          Cookie: ownerCookie,
        },
        body: JSON.stringify({ kind: 'image' }),
      },
      env
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        folder: string;
        timestamp: number;
        signature: string;
        maxBytes: number;
      };
    };
    expect(body.data.folder).toBe('portfolio/images');
    expect(body.data.maxBytes).toBe(10 * 1024 * 1024);

    const expectedSig = await signCloudinaryParams(
      { folder: 'portfolio/images', timestamp: body.data.timestamp },
      env.CLOUDINARY_API_SECRET
    );
    expect(body.data.signature).toBe(expectedSig);
  });

  it('parses YouTube, Vimeo, and Loom URLs and rejects unsupported video providers', () => {
    const yt1 = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(yt1.provider).toBe('youtube');
    expect(yt1.embedId).toBe('dQw4w9WgXcQ');

    const yt2 = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(yt2.provider).toBe('youtube');
    expect(yt2.embedId).toBe('dQw4w9WgXcQ');

    const vimeo = parseVideoUrl('https://vimeo.com/123456789');
    expect(vimeo.provider).toBe('vimeo');
    expect(vimeo.embedId).toBe('123456789');

    const loom = parseVideoUrl('https://www.loom.com/share/1234567890abcdef1234567890abcdef');
    expect(loom.provider).toBe('loom');
    expect(loom.embedId).toBe('1234567890abcdef1234567890abcdef');

    expect(() => parseVideoUrl('https://example.com/video.mp4')).toThrow();
  });

  it('rejects oversized video clips (>30s) and blocks deleting media still referenced by projects with 409 CONFLICT', async () => {
    const tooLongRes = await app.request(
      '/v1/admin/media',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
          Cookie: ownerCookie,
        },
        body: JSON.stringify({
          kind: 'video',
          publicId: 'portfolio/clips/demo',
          url: 'https://res.cloudinary.com/demo/video/upload/demo.mp4',
          durationSec: 45,
        }),
      },
      env
    );
    expect(tooLongRes.status).toBe(400);

    // Register valid image and reference it from a project
    const mediaId = uuidv7();
    store.media.push({
      id: mediaId,
      provider: 'cloudinary',
      kind: 'image',
      url: 'https://res.cloudinary.com/demo/image/upload/v1/cover.webp',
      deletedAt: null,
    });
    store.projects.push({
      id: uuidv7(),
      slug: 'proj-using-media',
      coverMediaId: mediaId,
      deletedAt: null,
    });

    const delRes = await app.request(
      `/v1/admin/media/${mediaId}`,
      {
        method: 'DELETE',
        headers: {
          Origin: 'http://localhost:3000',
          Cookie: ownerCookie,
        },
      },
      env
    );
    expect(delRes.status).toBe(409);
    const delBody = (await delRes.json()) as { error: { code: string; details: unknown[] } };
    expect(delBody.error.code).toBe('CONFLICT');
    expect(delBody.error.details.length).toBeGreaterThan(0);
  });
});
