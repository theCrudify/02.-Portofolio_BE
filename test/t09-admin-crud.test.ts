import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { app } from '@/index';
import { setTestDb, type DbClient } from '@/db/client';
import { lk } from '@/db/queries/lookups';
import { auditLogs, experiences, lookups, media, projects, technologies, users } from '@/db/schema';
import { signSession } from '@/lib/jwt';
import { archived, draft, insertOrganization, lookupIdOf, published, useTestDb } from './helpers/db';

describe('T09 · Admin CRUD, Status Transitions, Role Restrictions & Revalidate', () => {
  const jwtSecret = 'dev-jwt-secret-min-32-chars-long';
  const ownerId = '01950000-0000-7000-8000-000000000001';
  const editorId = '01950000-0000-7000-8000-000000000002';
  const viewerId = '01950000-0000-7000-8000-000000000003';
  let db: DbClient;
  let ownerCookie: string;
  let editorCookie: string;
  let viewerCookie: string;

  const env = {
    DATABASE_URL: 'postgres://localhost/test',
    JWT_SECRET: jwtSecret,
    HASH_SALT: 'salt',
    FRONTEND_URL: 'http://localhost:3000',
    REVALIDATE_SECRET: 'rev-secret',
    TURNSTILE_SECRET: 'ts',
    CLOUDINARY_CLOUD_NAME: 'cloud',
    CLOUDINARY_API_KEY: 'key',
    CLOUDINARY_API_SECRET: 'sec',
    RESEND_API_KEY: 're',
    CONTACT_TO_EMAIL: 'me@example.com',
  };

  const json = (cookie: string, method: string, body: unknown): RequestInit => ({
    method,
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', Cookie: cookie },
    body: JSON.stringify(body),
  });
  const bare = (cookie: string, method: string): RequestInit => ({
    method,
    headers: { Origin: 'http://localhost:3000', Cookie: cookie },
  });

  async function insertProject(
    slug: string,
    status: typeof draft | typeof published,
    extra: Partial<typeof projects.$inferInsert> = {},
  ) {
    const [row] = await db
      .insert(projects)
      .values({
        slug,
        titleEn: 'Title',
        titleId: 'Judul',
        summaryEn: 'Summary',
        summaryId: 'Ringkasan',
        typeId: lk('project_type', 'company'),
        stateId: lk('project_state', 'in_development'),
        ...status(),
        ...extra,
      })
      .returning({ id: projects.id });
    return row!.id;
  }

  async function projectPayload(slug: string) {
    return {
      slug,
      titleId: 'Gateway API Edge',
      titleEn: 'Edge API Gateway',
      summaryId: 'Ringkasan proyek gateway',
      summaryEn: 'Gateway project summary',
      typeId: await lookupIdOf(db, 'project_type', 'company'),
      stateId: await lookupIdOf(db, 'project_state', 'live'),
    };
  }

  beforeEach(async () => {
    db = await useTestDb();
    // Revalidate webhooks go to FRONTEND_URL; keep tests off the network.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    const roles = { [ownerId]: 'owner', [editorId]: 'editor', [viewerId]: 'viewer' } as const;
    await db.insert(users).values(
      Object.entries(roles).map(([id, role]) => ({
        id,
        email: `${role}@example.com`,
        name: role,
        passwordHash: 'x',
        roleId: lk('user_role', role),
      })),
    );
    ownerCookie = `pf_session=${await signSession({ sub: ownerId, role: 'owner', tv: 0 }, jwtSecret)}`;
    editorCookie = `pf_session=${await signSession({ sub: editorId, role: 'editor', tv: 0 }, jwtSecret)}`;
    viewerCookie = `pf_session=${await signSession({ sub: viewerId, role: 'viewer', tv: 0 }, jwtSecret)}`;
  });

  afterEach(() => {
    setTestDb(null);
    vi.restoreAllMocks();
  });

  it('creates project as draft, enforces valid status transitions, and blocks invalid transitions with 400 INVALID_STATE', async () => {
    const createRes = await app.request(
      '/v1/admin/projects',
      json(ownerCookie, 'POST', await projectPayload('edge-api-gateway')),
      env,
    );
    expect(createRes.status).toBe(201);
    const createdBody = (await createRes.json()) as { data: { id: string; status: string } };
    expect(createdBody.data.status).toBe('draft');
    const projectId = createdBody.data.id;

    const invalidRes = await app.request(`/v1/admin/projects/${projectId}/unpublish`, bare(ownerCookie, 'POST'), env);
    expect(invalidRes.status).toBe(400);
    expect(((await invalidRes.json()) as { error: { code: string } }).error.code).toBe('INVALID_STATE');

    const publishRes = await app.request(`/v1/admin/projects/${projectId}/publish`, bare(ownerCookie, 'POST'), env);
    expect(publishRes.status).toBe(200);
    const publishedBody = (await publishRes.json()) as { data: { status: string; publishedAt: string } };
    expect(publishedBody.data.status).toBe('published');
    expect(publishedBody.data.publishedAt).toBeTruthy();

    const [stored] = await db
      .select({ code: lookups.code })
      .from(projects)
      .innerJoin(lookups, eq(lookups.id, projects.statusId))
      .where(eq(projects.id, projectId));
    expect(stored?.code).toBe('published');

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.resourceId, projectId));
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it('creates a project with child collections and reads them back from the detail route', async () => {
    const orgId = await insertOrganization(db, { name: 'Acme Corp' });
    const [exp] = await db
      .insert(experiences)
      .values({
        organizationId: orgId,
        roleEn: 'Backend Engineer',
        employmentTypeId: lk('employment_type', 'full_time'),
        startDate: '2024-01-01',
        ...published(),
      })
      .returning({ id: experiences.id });
    const repoService = await lookupIdOf(db, 'link_type', 'repo_service');
    const demo = await lookupIdOf(db, 'link_type', 'demo');

    const createRes = await app.request(
      '/v1/admin/projects',
      json(ownerCookie, 'POST', {
        ...(await projectPayload('with-children')),
        clientOrganizationId: orgId,
        responsibilities: [{ textEn: 'Designed the API', textId: 'Merancang API' }, { textEn: 'Ran deploys' }],
        links: [
          { typeId: repoService, label: 'Payment service', isPrivate: true },
          { typeId: demo, label: 'Demo', url: 'https://demo.example.com' },
        ],
        experiences: [{ experienceId: exp!.id }],
      }),
      env,
    );
    expect(createRes.status).toBe(201);
    const { data: created } = (await createRes.json()) as { data: { id: string } };

    const detail = await app.request(`/v1/admin/projects/${created.id}`, { headers: { Cookie: viewerCookie } }, env);
    expect(detail.status).toBe(200);
    const { data } = (await detail.json()) as { data: Record<string, unknown> };
    expect(data.status).toBe('draft');
    expect(data.clientOrganizationId).toBe(orgId);
    expect(data.responsibilities).toEqual([
      { textEn: 'Designed the API', textId: 'Merancang API' },
      { textEn: 'Ran deploys', textId: null },
    ]);
    expect(data.links).toEqual([
      { typeId: repoService, label: 'Payment service', url: null, isPrivate: true },
      { typeId: demo, label: 'Demo', url: 'https://demo.example.com', isPrivate: false },
    ]);
    expect(data.experiences).toEqual([{ experienceId: exp!.id }]);
  });

  it('saves a certificate with description, attachments, links, achievements and skills, and shows them publicly', async () => {
    const issuer = await insertOrganization(db, { name: 'Dicoding', type: 'certification_issuer' });
    const [pdf, photo] = await db
      .insert(media)
      .values([
        { providerId: lk('media_provider', 'cloudinary'), kindId: lk('media_kind', 'pdf'), url: 'https://res.cloudinary.com/demo/raw/upload/cert.pdf' },
        { providerId: lk('media_provider', 'cloudinary'), kindId: lk('media_kind', 'image'), url: 'https://res.cloudinary.com/demo/image/upload/photo.jpg' },
      ])
      .returning({ id: media.id });
    const [tech] = await db
      .insert(technologies)
      .values({ name: 'Docker', slug: 'docker', categoryId: lk('tech_category', 'tools'), ...published() })
      .returning({ id: technologies.id });
    const other = await lookupIdOf(db, 'link_type', 'other');

    const createRes = await app.request(
      '/v1/admin/certifications',
      json(ownerCookie, 'POST', {
        typeId: await lookupIdOf(db, 'cert_type', 'bootcamp'),
        name: 'Cloud Bootcamp',
        issuerOrganizationId: issuer,
        descriptionEn: 'A long description.',
        achievements: [{ textEn: 'Top 10 graduate' }],
        technologies: [{ technologyId: tech!.id }],
        links: [{ typeId: other, label: 'LinkedIn post', url: 'https://www.linkedin.com/posts/x' }],
        media: [{ mediaId: pdf!.id, captionEn: 'Certificate' }, { mediaId: photo!.id }],
      }),
      env,
    );
    expect(createRes.status).toBe(201);
    const { data: created } = (await createRes.json()) as { data: Record<string, unknown> & { id: string } };
    expect(created.media).toEqual([
      { mediaId: pdf!.id, captionEn: 'Certificate', captionId: null },
      { mediaId: photo!.id, captionEn: null, captionId: null },
    ]);
    await app.request(`/v1/admin/certifications/${created.id}/publish`, bare(ownerCookie, 'POST'), env);

    const res = await app.request('/v1/certifications', {}, env);
    const { data } = (await res.json()) as { data: Record<string, unknown>[] };
    expect(data[0]).toMatchObject({
      description: 'A long description.',
      achievements: ['Top 10 graduate'],
      technologies: [{ name: 'Docker', slug: 'docker' }],
      links: [{ label: 'LinkedIn post', url: 'https://www.linkedin.com/posts/x', type: { code: 'other' } }],
      attachments: [
        { id: pdf!.id, kind: 'pdf', caption: 'Certificate' },
        { id: photo!.id, kind: 'image', caption: null },
      ],
    });
  });

  it('replaces only the child collections sent on update', async () => {
    const demo = await lookupIdOf(db, 'link_type', 'demo');
    const createRes = await app.request(
      '/v1/admin/projects',
      json(ownerCookie, 'POST', {
        ...(await projectPayload('partial-update')),
        responsibilities: [{ textEn: 'Old one' }, { textEn: 'Old two' }],
        links: [{ typeId: demo, label: 'Demo', url: 'https://demo.example.com' }],
      }),
      env,
    );
    const { data: created } = (await createRes.json()) as { data: { id: string } };

    const updateRes = await app.request(
      `/v1/admin/projects/${created.id}`,
      json(editorCookie, 'PUT', { titleEn: 'Renamed', responsibilities: [{ textEn: 'New only' }] }),
      env,
    );
    expect(updateRes.status).toBe(200);
    const { data } = (await updateRes.json()) as { data: Record<string, unknown> };
    expect(data.titleEn).toBe('Renamed');
    expect(data.responsibilities).toEqual([{ textEn: 'New only', textId: null }]);
    expect(data.links).toEqual([{ typeId: demo, label: 'Demo', url: 'https://demo.example.com', isPrivate: false }]);
  });

  it('rejects a lookup id from the wrong group with 400 VALIDATION_ERROR', async () => {
    const wrong = await lookupIdOf(db, 'link_type', 'demo');
    const res = await app.request(
      '/v1/admin/projects',
      json(ownerCookie, 'POST', { ...(await projectPayload('wrong-group')), typeId: wrong }),
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Invalid master-data reference');
    expect(await db.$count(projects, eq(projects.slug, 'wrong-group'))).toBe(0);

    // Same check applies inside child collections.
    const childRes = await app.request(
      '/v1/admin/projects',
      json(ownerCookie, 'POST', {
        ...(await projectPayload('wrong-child-group')),
        links: [{ typeId: await lookupIdOf(db, 'project_type', 'company'), label: 'X', url: 'https://x.dev' }],
      }),
      env,
    );
    expect(childRes.status).toBe(400);
  });

  it('forbids editor from publishing or editing non-draft items', async () => {
    const projectId = await insertProject('published-proj', published);

    const unpubRes = await app.request(`/v1/admin/projects/${projectId}/unpublish`, bare(editorCookie, 'POST'), env);
    expect(unpubRes.status).toBe(403);

    const updateRes = await app.request(
      `/v1/admin/projects/${projectId}`,
      json(editorCookie, 'PUT', { slug: 'published-proj', titleEn: 'New Title' }),
      env,
    );
    expect(updateRes.status).toBe(403);
  });

  it('requires confirmSlugChange for a published slug change and permanent-deletes only archived or soft-deleted items', async () => {
    const projectId = await insertProject('original-slug', published);

    const slugChangeFail = await app.request(
      `/v1/admin/projects/${projectId}`,
      json(ownerCookie, 'PUT', { slug: 'new-slug' }),
      env,
    );
    expect(slugChangeFail.status).toBe(400);

    const slugChangeOk = await app.request(
      `/v1/admin/projects/${projectId}`,
      json(ownerCookie, 'PUT', { slug: 'new-slug', confirmSlugChange: true }),
      env,
    );
    expect(slugChangeOk.status).toBe(200);
    expect(((await slugChangeOk.json()) as { data: { slug: string } }).data.slug).toBe('new-slug');

    const permFail = await app.request(`/v1/admin/projects/${projectId}/permanent`, bare(ownerCookie, 'DELETE'), env);
    expect(permFail.status).toBe(400);
    expect(((await permFail.json()) as { error: { code: string } }).error.code).toBe('INVALID_STATE');

    const archivedId = await insertProject('archived-one', archived);
    const permOk = await app.request(`/v1/admin/projects/${archivedId}/permanent`, bare(ownerCookie, 'DELETE'), env);
    expect(permOk.status).toBeLessThan(300);
    expect(await db.$count(projects, eq(projects.id, archivedId))).toBe(0);

    const softId = await insertProject('soft-deleted', draft, { deletedAt: new Date() });
    const permSoft = await app.request(`/v1/admin/projects/${softId}/permanent`, bare(ownerCookie, 'DELETE'), env);
    expect(permSoft.status).toBeLessThan(300);
    expect(await db.$count(projects, eq(projects.id, softId))).toBe(0);
  });

  it('lets viewer read but not write, per contract role table', async () => {
    const list = await app.request('/v1/admin/projects', { headers: { Cookie: viewerCookie } }, env);
    expect(list.status).toBe(200);
    const profileRes = await app.request('/v1/admin/profile', { headers: { Cookie: viewerCookie } }, env);
    expect(profileRes.status).toBe(200);

    const create = await app.request(
      '/v1/admin/projects',
      json(viewerCookie, 'POST', await projectPayload('viewer-try')),
      env,
    );
    expect(create.status).toBe(403);
  });

  it('reports the true total across pages and filters by status code', async () => {
    for (const n of [1, 2, 3]) await insertProject(`p${n}`, draft, { sortOrder: n });
    await insertProject('p4', published, { sortOrder: 4 });

    const res = await app.request('/v1/admin/projects?limit=1', { headers: { Cookie: viewerCookie } }, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { slug: string; status: string }[]; meta: { total: number; limit: number } };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ slug: 'p1', status: 'draft' });
    expect(body.meta.limit).toBe(1);
    expect(body.meta.total).toBe(4);

    const pub = await app.request('/v1/admin/projects?status=published', { headers: { Cookie: viewerCookie } }, env);
    const pubBody = (await pub.json()) as { data: { slug: string }[]; meta: { total: number } };
    expect(pubBody.data.map((p) => p.slug)).toEqual(['p4']);
    expect(pubBody.meta.total).toBe(1);
  });

  it('reorders with PUT { ids } as editor in a single batch and writes audit log', async () => {
    const ids = [await insertProject('a1', draft), await insertProject('a2', draft), await insertProject('a3', draft)];
    const batch = vi.spyOn(db, 'batch');
    const res = await app.request(
      '/v1/admin/projects/reorder',
      json(editorCookie, 'PUT', { ids: [ids[2], ids[0], ids[1]] }),
      env,
    );
    expect(res.status).toBe(200);
    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch.mock.calls[0]![0]).toHaveLength(3);

    const order = await db.select({ id: projects.id, sortOrder: projects.sortOrder }).from(projects);
    expect(Object.fromEntries(order.map((r) => [r.id, r.sortOrder]))).toEqual({ [ids[2]!]: 0, [ids[0]!]: 1, [ids[1]!]: 2 });

    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.actionId, lk('audit_action', 'reorder')), eq(auditLogs.resource, 'projects')));
    expect(logs).toHaveLength(1);

    const dup = await app.request('/v1/admin/projects/reorder', json(editorCookie, 'PUT', { ids: [ids[0], ids[0]] }), env);
    expect(dup.status).toBe(400);
  });

  it('lets editor soft-delete drafts but not published items', async () => {
    const draftId = await insertProject('d', draft);
    const ok = await app.request(`/v1/admin/projects/${draftId}`, bare(editorCookie, 'DELETE'), env);
    expect(ok.status).toBe(204);
    const [row] = await db.select({ deletedAt: projects.deletedAt }).from(projects).where(eq(projects.id, draftId));
    expect(row?.deletedAt).toBeTruthy();

    const pubId = await insertProject('p', published);
    const denied = await app.request(`/v1/admin/projects/${pubId}`, bare(editorCookie, 'DELETE'), env);
    expect(denied.status).toBe(403);
  });

  it('creates and lists organizations', async () => {
    const typeId = await lookupIdOf(db, 'organization_type', 'client');
    const create = await app.request(
      '/v1/admin/organizations',
      json(editorCookie, 'POST', { name: 'Globex', slug: 'globex', typeId, websiteUrl: 'https://globex.example.com' }),
      env,
    );
    expect(create.status).toBe(201);
    const { data } = (await create.json()) as { data: { id: string; status: string; typeId: string } };
    expect(data).toMatchObject({ status: 'draft', typeId });

    const list = await app.request('/v1/admin/organizations?search=globex', { headers: { Cookie: viewerCookie } }, env);
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as { data: { id: string; slug: string }[] };
    expect(listBody.data.map((o) => o.slug)).toEqual(['globex']);

    const wrongType = await app.request(
      '/v1/admin/organizations',
      json(editorCookie, 'POST', { name: 'Bad', slug: 'bad', typeId: await lookupIdOf(db, 'project_type', 'company') }),
      env,
    );
    expect(wrongType.status).toBe(400);
  });

  describe('/v1/admin/lookups', () => {
    type Group = { id: string; code: string; isSystem: boolean; values: { id: string; code: string; isSystem: boolean }[] };
    async function groups(): Promise<Group[]> {
      const res = await app.request('/v1/admin/lookups', { headers: { Cookie: viewerCookie } }, env);
      expect(res.status).toBe(200);
      return ((await res.json()) as { data: Group[] }).data;
    }

    it('lists groups with values to a viewer', async () => {
      const all = await groups();
      const linkType = all.find((g) => g.code === 'link_type');
      expect(linkType?.isSystem).toBe(false);
      expect(linkType?.values.map((v) => v.code)).toContain('repo_service');
      expect(all.find((g) => g.code === 'content_status')?.isSystem).toBe(true);
    });

    it('creates a value in a non-system group, but 403 in a system group', async () => {
      const all = await groups();
      const linkType = all.find((g) => g.code === 'link_type')!;
      const created = await app.request(
        '/v1/admin/lookups',
        json(editorCookie, 'POST', { groupId: linkType.id, code: 'gitlab', labelEn: 'GitLab' }),
        env,
      );
      expect(created.status).toBe(201);
      expect(((await created.json()) as { data: { code: string; isSystem: boolean } }).data).toMatchObject({
        code: 'gitlab',
        isSystem: false,
      });
      expect(await lookupIdOf(db, 'link_type', 'gitlab')).toBeTruthy();

      const dup = await app.request(
        '/v1/admin/lookups',
        json(editorCookie, 'POST', { groupId: linkType.id, code: 'gitlab', labelEn: 'GitLab again' }),
        env,
      );
      expect(dup.status).toBe(409);

      const status = all.find((g) => g.code === 'content_status')!;
      const sysRes = await app.request(
        '/v1/admin/lookups',
        json(ownerCookie, 'POST', { groupId: status.id, code: 'review', labelEn: 'In review' }),
        env,
      );
      expect(sysRes.status).toBe(403);
    });

    it('409 when deleting an in-use value, 403 for a system value, deletes an unused one', async () => {
      await insertProject('uses-in-dev', draft);
      const inUse = await lookupIdOf(db, 'project_state', 'in_development');
      const conflict = await app.request(`/v1/admin/lookups/${inUse}`, bare(ownerCookie, 'DELETE'), env);
      expect(conflict.status).toBe(409);

      const system = await lookupIdOf(db, 'project_state', 'live');
      const sysDel = await app.request(`/v1/admin/lookups/${system}`, bare(ownerCookie, 'DELETE'), env);
      expect(sysDel.status).toBe(403);

      const unused = await lookupIdOf(db, 'link_type', 'postman');
      const editorDel = await app.request(`/v1/admin/lookups/${unused}`, bare(editorCookie, 'DELETE'), env);
      expect(editorDel.status).toBe(403);
      const del = await app.request(`/v1/admin/lookups/${unused}`, bare(ownerCookie, 'DELETE'), env);
      expect(del.status).toBe(200);
      expect(await db.$count(lookups, eq(lookups.id, unused))).toBe(0);
    });
  });

  it('refuses to authenticate when JWT_SECRET is missing instead of using a default', async () => {
    const res = await app.request('/v1/admin/projects', { headers: { Cookie: ownerCookie } }, { ...env, JWT_SECRET: '' });
    expect(res.status).toBe(500);
  });
});
