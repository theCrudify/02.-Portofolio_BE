import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setTestDb, type DbClient } from '@/db/client';
import { lk } from '@/db/queries/lookups';
import { media, projects, users } from '@/db/schema';
import { app } from '@/index';
import { signCloudinaryParams } from '@/lib/cloudinary';
import { signSession } from '@/lib/jwt';
import { parseVideoUrl } from '@/lib/oembed';
import { draft, insertOrganization, useTestDb } from './helpers/db';

describe('T10 · Media Library, Cloudinary Signature, Video Embed & 409 Usage Protection', () => {
  const jwtSecret = 'dev-jwt-secret-min-32-chars-long';
  const ownerId = '01950000-0000-7000-8000-000000000001';
  let db: DbClient;
  let ownerCookie: string;

  beforeEach(async () => {
    db = await useTestDb();
    await db.insert(users).values({
      id: ownerId,
      email: 'owner@example.com',
      name: 'Owner',
      passwordHash: 'unused',
      roleId: lk('user_role', 'owner'),
    });
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

  const post = (path: string, body: unknown) =>
    app.request(
      path,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', Cookie: ownerCookie },
        body: JSON.stringify(body),
      },
      env,
    );

  it('generates deterministic Cloudinary SHA-1 upload signature and folder/limits per kind', async () => {
    const expected = {
      image: { folder: 'portfolio/images', maxBytes: 10 * 1024 * 1024 },
      video: { folder: 'portfolio/clips', maxBytes: 25 * 1024 * 1024 },
      pdf: { folder: 'portfolio/docs', maxBytes: 15 * 1024 * 1024 },
      // documentation also takes slide decks and office files, so it allows larger uploads
      document: { folder: 'portfolio/docs', maxBytes: 25 * 1024 * 1024 },
    };
    for (const [kind, rule] of Object.entries(expected)) {
      const res = await post('/v1/admin/media/sign', { kind });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { folder: string; timestamp: number; signature: string; maxBytes: number };
      };
      expect(body.data.folder).toBe(rule.folder);
      expect(body.data.maxBytes).toBe(rule.maxBytes);
      const expectedSig = await signCloudinaryParams(
        { folder: rule.folder, timestamp: body.data.timestamp },
        env.CLOUDINARY_API_SECRET,
      );
      expect(body.data.signature).toBe(expectedSig);
    }

    expect((await post('/v1/admin/media/sign', { kind: 'hologram' })).status).toBe(400);
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

  it('rejects oversized video clips (>30s) and blocks deleting media still referenced (project cover, organization logo) with 409 CONFLICT', async () => {
    const tooLongRes = await post('/v1/admin/media', {
      kind: 'video',
      publicId: 'portfolio/clips/demo',
      url: 'https://res.cloudinary.com/demo/video/upload/demo.mp4',
      durationSec: 45,
    });
    expect(tooLongRes.status).toBe(400);
    expect(await db.$count(media)).toBe(0);

    // Registering via the API stores kind/provider as lookup FKs.
    const createRes = await post('/v1/admin/media', {
      kind: 'image',
      publicId: 'portfolio/images/cover',
      url: 'https://res.cloudinary.com/demo/image/upload/v1/cover.webp',
    });
    expect(createRes.status).toBe(201);
    const mediaId = ((await createRes.json()) as { data: { id: string } }).data.id;

    await db.insert(projects).values({
      slug: 'proj-using-media',
      titleEn: 'Project',
      summaryEn: 'Summary',
      typeId: lk('project_type', 'personal'),
      stateId: lk('project_state', 'live'),
      coverMediaId: mediaId,
      ...draft(),
    });
    const orgId = await insertOrganization(db, { name: 'Acme Corp', logoMediaId: mediaId });

    const del = () =>
      app.request(
        `/v1/admin/media/${mediaId}`,
        { method: 'DELETE', headers: { Origin: 'http://localhost:3000', Cookie: ownerCookie } },
        env,
      );
    const delRes = await del();
    expect(delRes.status).toBe(409);
    const delBody = (await delRes.json()) as {
      error: { code: string; details: { path: string; message: string }[] };
    };
    expect(delBody.error.code).toBe('CONFLICT');
    expect(delBody.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'projects' }),
        { path: 'organizations', message: `Referenced by organizations (${orgId})` },
      ]),
    );
  });

  it('lists media filtered by kind code (lookup FK)', async () => {
    const createRes = await post('/v1/admin/media', {
      kind: 'image',
      publicId: 'portfolio/images/cover',
      url: 'https://res.cloudinary.com/demo/image/upload/v1/cover.webp',
    });
    const mediaId = ((await createRes.json()) as { data: { id: string } }).data.id;
    await post('/v1/admin/media', {
      kind: 'pdf',
      publicId: 'portfolio/docs/cv',
      url: 'https://res.cloudinary.com/demo/raw/upload/cv.pdf',
    });

    const listRes = await app.request('/v1/admin/media?kind=image', { headers: { Cookie: ownerCookie } }, env);
    expect(listRes.status).toBe(200);
    expect(((await listRes.json()) as { data: { id: string }[] }).data.map((m) => m.id)).toEqual([mediaId]);
  });
});
