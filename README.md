# portfolio-api

REST API untuk web portofolio berbasis **Hono** di **Cloudflare Workers** dan **Drizzle ORM** di **Neon PostgreSQL** (`neon-http`).

## Prasyarat
- Node.js 22 LTS
- npm
- Akun Cloudflare & Neon PostgreSQL (region `aws-ap-southeast-1`)

## Setup Lokal

1. Install dependensi:
   ```bash
   npm install
   ```

2. Salin `.dev.vars.example` ke `.dev.vars` dan isi variabel environment:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

3. Jalankan server development (port 8787):
   ```bash
   npm run dev
   ```

## Perintah

| Perintah | Deskripsi |
| --- | --- |
| `npm run dev` | Menjalankan Wrangler dev server di port 8787 |
| `npm run typecheck` | Memeriksa tipe TypeScript (`tsc --noEmit`) |
| `npm run lint` | Menjalankan ESLint |
| `npm run format` | Memformat kode dengan Prettier |
| `npm test` | Menjalankan unit/integration test dengan Vitest |
| `npm run db:generate` | Membuat file migrasi Drizzle |
| `npm run db:migrate` | Menjalankan migrasi database ke `DATABASE_URL` |
| `npm run db:seed` | Menjalankan script seed (`tsx scripts/seed.ts`) |
| `npm run deploy` | Deploy ke Cloudflare Workers (`wrangler deploy`) |

## Variabel Environment (`.dev.vars`)

| Nama | Deskripsi |
| --- | --- |
| `DATABASE_URL` | Connection string Neon PostgreSQL |
| `JWT_SECRET` | Secret HS256 untuk penandatanganan JWT |
| `HASH_SALT` | Salt untuk hashing IP/visitor/token |
| `FRONTEND_URL` | Origin situs frontend (misal `http://localhost:3000`) |
| `REVALIDATE_SECRET` | Secret untuk webhook revalidate ke Next.js |
| `TURNSTILE_SECRET` | Secret key Cloudflare Turnstile |
| `CLOUDINARY_CLOUD_NAME` | Cloud name Cloudinary |
| `CLOUDINARY_API_KEY` | API key Cloudinary |
| `CLOUDINARY_API_SECRET` | API secret Cloudinary |
| `RESEND_API_KEY` | API key Resend untuk pengiriman email |
| `CONTACT_TO_EMAIL` | Alamat email tujuan form kontak |
| `SENTRY_DSN` | DSN Sentry untuk error monitoring |
| `GITHUB_TOKEN` | Personal Access Token GitHub untuk sinkronisasi statistik |
| `GITHUB_USERNAME` | Username GitHub untuk sinkronisasi statistik |

