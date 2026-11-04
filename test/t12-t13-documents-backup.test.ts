import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { setTestDb, type DbClient } from '@/db/client';
import { lk } from '@/db/queries/lookups';
import {
  documents,
  events,
  experienceResponsibilities,
  experiences,
  exportPresetSections,
  exportPresetTechnologies,
  exportPresets,
  media,
  profile,
  projects,
  shareLinks,
  technologies,
  users,
} from '@/db/schema';
import { app } from '@/index';
import { signSession } from '@/lib/jwt';
import { generateShareToken } from '@/services/document.service';
import { insertOrganization, lookupIdOf, published, useTestDb } from './helpers/db';

describe('T12 & T13 · Documents, Export Presets, Share Links (410 Expired), JSON Resume & Backup Dry-Run', () => {
  const jwtSecret = 'dev-jwt-secret-min-32-chars-long';
  const ownerId = '01950000-0000-7000-8000-000000000001';
  const publicPresetId = '01950000-0000-7000-8000-000000000010';
  const privatePresetId = '01950000-0000-7000-8000-000000000011';
  let db: DbClient;
  let ownerCookie: string;

  const env = {
    DATABASE_URL: 'postgres://localhost/test',
    JWT_SECRET: jwtSecret,
    HASH_SALT: 'salt',
    FRONTEND_URL: 'http://localhost:3000',
    REVALIDATE_SECRET: 'rev',
    TURNSTILE_SECRET: 'ts',
    CLOUDINARY_CLOUD_NAME: 'cloud',
    CLOUDINARY_API_KEY: 'key',
    CLOUDINARY_API_SECRET: 'sec',
    RESEND_API_KEY: 're',
    CONTACT_TO_EMAIL: 'me@example.com',
  };
  const jsonHeaders = () => ({
    'Content-Type': 'application/json',
    Origin: 'http://localhost:3000',
    Cookie: ownerCookie,
  });

  beforeEach(async () => {
    db = await useTestDb();
    await db.insert(users).values({
      id: ownerId,
      email: 'owner@example.com',
      name: 'Owner',
      passwordHash: 'unused',
      roleId: lk('user_role', 'owner'),
    });
    await db.insert(profile).values({
      id: 1,
      name: 'Jidan',
      headlineEn: 'Backend Engineer',
      bioEn: 'Building edge systems',
      email: 'jidan@example.com',
      location: 'Jakarta',
      availabilityId: lk('availability', 'open_to_work'),
      workPreferenceId: lk('work_mode', 'onsite'),
    });
    const project = (slug: string, titleEn: string, featured: boolean) => ({
      slug,
      titleEn,
      summaryEn: 'Summary',
      typeId: lk('project_type', 'personal'),
      stateId: lk('project_state', 'live'),
      featured,
      ...published(),
    });
    await db
      .insert(projects)
      .values([project('feat-proj', 'Featured Project', true), project('non-feat-proj', 'Other Project', false)]);

    const orgId = await insertOrganization(db, { name: 'PT Edge Systems', websiteUrl: 'https://edge.example.com' });
    const [exp] = await db
      .insert(experiences)
      .values({
        organizationId: orgId,
        roleEn: 'Backend Engineer',
        employmentTypeId: lk('employment_type', 'full_time'),
        startDate: '2023-01-01',
        ...published(),
      })
      .returning({ id: experiences.id });
    await db.insert(experienceResponsibilities).values([
      { experienceId: exp!.id, textEn: 'Design APIs', sortOrder: 0 },
      { experienceId: exp!.id, textEn: 'Run on-call', sortOrder: 1 },
    ]);

    await db.insert(exportPresets).values([
      {
        id: publicPresetId,
        slug: 'full-cv',
        name: 'Full CV',
        templateId: lk('export_template', 'full'),
        localeId: lk('locale', 'en'),
        featuredOnly: true,
        isPublic: true,
      },
      {
        id: privatePresetId,
        slug: 'private-preset',
        name: 'Private Preset',
        templateId: lk('export_template', 'ats'),
        localeId: lk('locale', 'en'),
        isPublic: false,
      },
    ]);
    await db.insert(exportPresetSections).values([
      { presetId: publicPresetId, sectionId: lk('site_section', 'experience'), sortOrder: 0 },
      { presetId: publicPresetId, sectionId: lk('site_section', 'projects'), itemLimit: 5, sortOrder: 1 },
      { presetId: privatePresetId, sectionId: lk('site_section', 'projects'), sortOrder: 0 },
    ]);

    const token = await signSession({ sub: ownerId, role: 'owner', tv: 0 }, jwtSecret);
    ownerCookie = `pf_session=${token}`;
  });

  afterEach(() => {
    setTestDb(null);
  });

  it('activates a single CV document per type+locale and serves JSON Resume & public export presets (while blocking private presets)', async () => {
    const [asset] = await db
      .insert(media)
      .values({
        providerId: lk('media_provider', 'cloudinary'),
        kindId: lk('media_kind', 'pdf'),
        url: 'https://res.cloudinary.com/demo/raw/upload/cv.pdf',
      })
      .returning({ id: media.id });
    const docValues = (title: string, isActive: boolean, locale = 'en') => ({
      mediaId: asset!.id,
      typeId: lk('document_type', 'cv'),
      localeId: lk('locale', locale),
      title,
      isActive,
    });
    const [doc1, doc2, docId] = await db
      .insert(documents)
      .values([docValues('CV v1', true), docValues('CV v2', false), docValues('CV id', true, 'id')])
      .returning({ id: documents.id });

    const actRes = await app.request(
      `/v1/admin/documents/${doc2!.id}/activate`,
      { method: 'POST', headers: { Origin: 'http://localhost:3000', Cookie: ownerCookie } },
      env,
    );
    expect(actRes.status).toBe(200);
    const active = async (id: string) =>
      (await db.select({ a: documents.isActive }).from(documents).where(eq(documents.id, id)))[0]!.a;
    expect(await active(doc1!.id)).toBe(false);
    expect(await active(doc2!.id)).toBe(true);
    expect(await active(docId!.id)).toBe(true); // other locale untouched

    const cvRes = await app.request('/v1/documents/cv?locale=en', {}, env);
    expect(cvRes.status).toBe(200);
    const cvBody = (await cvRes.json()) as { data: { title: string; type: string; locale: string; downloadUrl: string } };
    expect(cvBody.data).toMatchObject({ title: 'CV v2', type: 'cv', locale: 'en' });
    expect(cvBody.data.downloadUrl).toBe('https://res.cloudinary.com/demo/raw/upload/cv.pdf');

    // Public export preset filters featuredOnly
    const pubPresetRes = await app.request('/v1/export/full-cv', {}, env);
    expect(pubPresetRes.status).toBe(200);
    const pubPresetBody = (await pubPresetRes.json()) as {
      data: { sections: { projects: { slug: string }[] } };
    };
    expect(pubPresetBody.data.sections.projects.map((p) => p.slug)).toEqual(['feat-proj']);

    // Private preset -> 404 on public route
    const privPresetRes = await app.request('/v1/export/private-preset', {}, env);
    expect(privPresetRes.status).toBe(404);

    // JSON Resume schema
    const resumeRes = await app.request('/v1/export/resume.json', {}, env);
    expect(resumeRes.status).toBe(200);
    const resumeBody = (await resumeRes.json()) as {
      data: {
        basics: { name: string };
        projects: unknown[];
        work: { name: string; position: string; url: string; highlights: string[] }[];
      };
    };
    expect(resumeBody.data.basics.name).toBe('Jidan');
    expect(resumeBody.data.projects.length).toBe(2);
    expect(resumeBody.data.work).toEqual([
      expect.objectContaining({
        name: 'PT Edge Systems',
        position: 'Backend Engineer',
        url: 'https://edge.example.com',
        highlights: ['Design APIs', 'Run on-call'],
      }),
    ]);
  });

  it('builds export sections keyed in preset order with linked organization and responsibilities', async () => {
    const res = await app.request('/v1/export/full-cv', {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        preset: { slug: string; template: string; locale: string };
        profile: { name: string };
        sections: Record<string, unknown[]> & {
          experience: { role: string; organization: { name: string }; responsibilities: string[] }[];
        };
      };
    };
    expect(body.data.preset).toMatchObject({ slug: 'full-cv', template: 'full', locale: 'en' });
    expect(body.data.profile.name).toBe('Jidan');
    expect(Object.keys(body.data.sections)).toEqual(['experience', 'projects']);
    expect(body.data.sections.experience).toEqual([
      expect.objectContaining({
        role: 'Backend Engineer',
        organization: expect.objectContaining({ name: 'PT Edge Systems' }),
        responsibilities: ['Design APIs', 'Run on-call'],
      }),
    ]);
  });

  it('round-trips preset sections order and technologyIds through child tables, and rejects unknown codes with 400', async () => {
    const [ts, go] = await db
      .insert(technologies)
      .values([
        { name: 'TypeScript', slug: 'typescript', categoryId: lk('tech_category', 'frontend'), ...published() },
        { name: 'Go', slug: 'go', categoryId: lk('tech_category', 'backend'), ...published() },
      ])
      .returning({ id: technologies.id });

    const payload = {
      slug: 'backend-cv',
      name: 'Backend CV',
      template: 'one_page',
      locale: 'id',
      featuredOnly: false,
      sinceYears: 5,
      isPublic: false,
      sortOrder: 3,
      sections: [{ key: 'skills', limit: 10 }, { key: 'experience' }, { key: 'projects', limit: 3 }],
      technologyIds: [ts!.id, go!.id],
    };
    const createRes = await app.request(
      '/v1/admin/export-presets',
      { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(payload) },
      env,
    );
    expect(createRes.status).toBe(201);
    const created = ((await createRes.json()) as { data: Record<string, unknown> & { id: string } }).data;
    expect(created).toMatchObject({
      ...payload,
      sections: [
        { key: 'skills', limit: 10 },
        { key: 'experience', limit: null },
        { key: 'projects', limit: 3 },
      ],
      technologyIds: expect.arrayContaining([ts!.id, go!.id]),
    });

    // Stored as child rows, ordered by sortOrder.
    const rows = await db
      .select({ sectionId: exportPresetSections.sectionId, limit: exportPresetSections.itemLimit })
      .from(exportPresetSections)
      .where(eq(exportPresetSections.presetId, created.id))
      .orderBy(asc(exportPresetSections.sortOrder));
    expect(rows).toEqual([
      { sectionId: await lookupIdOf(db, 'site_section', 'skills'), limit: 10 },
      { sectionId: await lookupIdOf(db, 'site_section', 'experience'), limit: null },
      { sectionId: await lookupIdOf(db, 'site_section', 'projects'), limit: 3 },
    ]);

    // Update reorders sections and replaces technologies.
    const updated = {
      ...payload,
      template: 'ats',
      sections: [{ key: 'projects' }, { key: 'skills', limit: 2 }],
      technologyIds: [go!.id],
    };
    const updRes = await app.request(
      `/v1/admin/export-presets/${created.id}`,
      { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify(updated) },
      env,
    );
    expect(updRes.status).toBe(200);
    expect(((await updRes.json()) as { data: unknown }).data).toMatchObject({
      template: 'ats',
      sections: [
        { key: 'projects', limit: null },
        { key: 'skills', limit: 2 },
      ],
      technologyIds: [go!.id],
    });
    expect(await db.$count(exportPresetSections, eq(exportPresetSections.presetId, created.id))).toBe(2);
    expect(
      await db
        .select({ id: exportPresetTechnologies.technologyId })
        .from(exportPresetTechnologies)
        .where(eq(exportPresetTechnologies.presetId, created.id)),
    ).toEqual([{ id: go!.id }]);

    const listRes = await app.request('/v1/admin/export-presets', { headers: { Cookie: ownerCookie } }, env);
    const listed = ((await listRes.json()) as { data: { slug: string; sections: { key: string }[] }[] }).data;
    expect(listed.find((p) => p.slug === 'backend-cv')!.sections.map((s) => s.key)).toEqual(['projects', 'skills']);

    // Unknown template / section codes -> 400, nothing written.
    const before = await db.$count(exportPresets);
    for (const bad of [
      { ...payload, slug: 'bad-template', template: 'glossy' },
      { ...payload, slug: 'bad-section', sections: [{ key: 'projects' }, { key: 'horoscope' }] },
    ]) {
      const res = await app.request(
        '/v1/admin/export-presets',
        { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(bad) },
        env,
      );
      expect(res.status).toBe(400);
    }
    const badUpd = await app.request(
      `/v1/admin/export-presets/${created.id}`,
      { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify({ ...payload, template: 'glossy' }) },
      env,
    );
    expect(badUpd.status).toBe(400);
    expect(await db.$count(exportPresets)).toBe(before);
  });

  it('generates 43-char base64url share tokens, serves private presets via valid share link, and returns 410 SHARE_LINK_EXPIRED when expired/inactive', async () => {
    const token = generateShareToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const activeToken = generateShareToken();
    const expiredToken = generateShareToken();
    const inactiveToken = generateShareToken();
    const [activeLink] = await db
      .insert(shareLinks)
      .values([
        {
          token: activeToken,
          label: 'PT ABC - Backend Engineer',
          presetId: privatePresetId,
          expiresAt: new Date(Date.now() + 86400_000),
        },
        {
          token: expiredToken,
          label: 'Expired Link',
          presetId: privatePresetId,
          expiresAt: new Date(Date.now() - 86400_000),
        },
        { token: inactiveToken, label: 'Inactive Link', presetId: privatePresetId, isActive: false },
      ])
      .returning({ id: shareLinks.id });

    const okShare = await app.request(`/v1/share/${activeToken}`, {}, env);
    expect(okShare.status).toBe(200);
    const okBody = (await okShare.json()) as {
      data: { kind: string; export: { preset: { slug: string }; sections: { projects: unknown[] } } };
    };
    expect(okBody.data.kind).toBe('preset');
    expect(okBody.data.export.preset.slug).toBe('private-preset');
    expect(okBody.data.export.sections.projects.length).toBe(2);

    const opens = await db
      .select({ shareLinkId: events.shareLinkId })
      .from(events)
      .where(eq(events.typeId, lk('event_type', 'share_open')));
    expect(opens).toEqual([{ shareLinkId: activeLink!.id }]);
    const [link] = await db.select().from(shareLinks).where(eq(shareLinks.id, activeLink!.id));
    expect(link!.viewCount).toBe(1);

    for (const t of [expiredToken, inactiveToken]) {
      const res = await app.request(`/v1/share/${t}`, {}, env);
      expect(res.status).toBe(410);
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe('SHARE_LINK_EXPIRED');
    }
  });

  it('returns 404 when updating a share link or export preset that does not exist', async () => {
    const missing = '01950000-0000-7000-8000-00000000dead';
    const link = await app.request(
      `/v1/admin/share-links/${missing}`,
      { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify({ label: 'x' }) },
      env,
    );
    expect(link.status).toBe(404);
    const preset = await app.request(
      `/v1/admin/export-presets/${missing}`,
      {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify({ slug: 'x', name: 'X', sections: [{ key: 'projects' }] }),
      },
      env,
    );
    expect(preset.status).toBe(404);
  });

  it('exports JSON backup bundle and supports dryRun=true import without mutating DB', async () => {
    const expRes = await app.request('/v1/admin/backup/export', { headers: { Cookie: ownerCookie } }, env);
    expect(expRes.status).toBe(200);
    const expBody = (await expRes.json()) as {
      data: { version: number; tables: Record<string, unknown[]> };
    };
    expect(expBody.data.version).toBe(2);
    expect(expBody.data.tables.projects).toHaveLength(2);
    expect(expBody.data.tables.organizations).toHaveLength(1);
    expect(expBody.data.tables.experienceResponsibilities).toHaveLength(2);
    expect(expBody.data.tables.exportPresetSections).toHaveLength(3);
    expect(expBody.data.tables.lookups!.length).toBeGreaterThan(0);
    expect(expBody.data.tables).not.toHaveProperty('users');

    const importReq = (body: unknown) =>
      app.request(
        '/v1/admin/backup/import?dryRun=true',
        { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(body) },
        env,
      );

    const beforeProjects = await db.$count(projects);
    const dryRes = await importReq(expBody.data);
    expect(dryRes.status).toBe(200);
    const dryBody = (await dryRes.json()) as {
      data: { dryRun: boolean; valid: boolean; counts: Record<string, number> };
    };
    expect(dryBody.data.dryRun).toBe(true);
    expect(dryBody.data.valid).toBe(true);
    expect(dryBody.data.counts.projects).toBe(2);
    expect(await db.$count(projects)).toBe(beforeProjects);

    const unknownRes = await importReq({ version: 2, tables: { users: [] } });
    expect(unknownRes.status).toBe(400);
  });
});
