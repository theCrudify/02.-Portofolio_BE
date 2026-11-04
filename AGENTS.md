# AGENTS.md · portfolio-api

> Salin file ini ke root repo `portfolio-api` sebagai `AGENTS.md`. AI coding agent membacanya otomatis di setiap sesi.

## Proyek
REST API untuk web portofolio. Hono di Cloudflare Workers, Drizzle ORM ke Neon Postgres (neon-http). Spesifikasi lengkap ada di dev kit: `01-PROJECT-CONTEXT.md`, `02-DATABASE-SCHEMA.md`, `03-API-CONTRACT.md`.

## Perintah
- `npm run dev` — wrangler dev (port 8787), membaca `.dev.vars`
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm test` — Vitest
- `npm run db:generate` — drizzle-kit generate
- `npm run db:migrate` — drizzle-kit migrate (pakai `DATABASE_URL` dari env)
- `npm run db:seed` — `tsx scripts/seed.ts`
- `npm run deploy` — `wrangler deploy`

## Struktur
```
src/
  index.ts              # app Hono, mount routes, export { fetch, scheduled }
  routes/               # public.ts, events.ts, auth.ts, admin/*.ts, docs.ts
  middleware/           # auth.ts, require-role.ts, csrf.ts, rate-limit.ts, error.ts, secure-headers
  services/             # logika bisnis per domain
  db/schema.ts          # SATU-SATUNYA sumber skema
  db/client.ts          # getDb(env)
  lib/                  # password.ts, jwt.ts, totp.ts, hash.ts, cloudinary.ts, oembed.ts, revalidate.ts, locale.ts, response.ts
  validators/           # skema Zod per resource (juga OpenAPI)
  types/env.ts          # tipe Bindings
scripts/seed.ts
drizzle/                # migrasi
test/                   # Vitest
```

## Aturan wajib
1. Runtime Workers: tidak ada API Node.js (`fs`, `crypto` Node, `Buffer` tanpa polyfill). Gunakan Web Crypto (`crypto.subtle`).
2. Jangan pakai `bcrypt`, `pg`, `jsonwebtoken`, `express`.
3. Semua respons lewat helper `ok(c, data, meta?)` dan `fail(c, status, code, message, details?)` di `lib/response.ts`.
4. Semua input divalidasi Zod sebelum menyentuh service.
5. Query publik selalu `status = 'published' AND deleted_at IS NULL`.
6. Setiap mutasi admin: cek role → validasi → service → `audit_logs` → revalidate (jika memengaruhi publik).
7. Jangan log data pribadi (email, IP mentah, password, token).
8. Jaga CPU per request kecil; operasi berat (agregasi) hanya di `scheduled`.
9. Jangan ubah `schema.ts` tanpa membuat migrasi baru via `db:generate`.
10. Setiap endpoint baru: tambah skema OpenAPI dan minimal satu test.

## Gaya kode
TypeScript strict, ESM, named export, fungsi kecil, early return, tidak ada `any`. Nama file kebab-case.

