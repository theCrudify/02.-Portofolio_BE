// Local-only API for screenshots: in-memory PGlite (never the real DATABASE_URL), migrated + seeded, served over Node http.
import http from 'node:http';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '@/db/schema';
import { setTestDb, type DbClient } from '@/db/client';
import { app } from '@/index';
import { seedDatabase } from './scripts/seed';

const env = JSON.parse(fs.readFileSync(process.argv[2]!, 'utf8'));
const db = drizzle(new PGlite(), { schema });
await migrate(db, { migrationsFolder: './drizzle' });
setTestDb(db as unknown as DbClient);
await seedDatabase(db as unknown as DbClient, { ownerEmail: 'demo@example.com', ownerPassword: 'DemoPassword123!', ownerName: 'Demo Owner' });
console.log('seeded');

http.createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const body = chunks.length && req.method !== 'GET' && req.method !== 'HEAD' ? Buffer.concat(chunks) : undefined;
  const r = await app.fetch(
    new Request(`http://localhost:8787${req.url}`, { method: req.method, headers: req.headers as Record<string, string>, body }),
    env,
    { waitUntil() {}, passThroughOnException() {} } as never,
  );
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(8787, () => console.log('local api on :8787'));
