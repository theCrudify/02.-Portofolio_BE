import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Tests run on Node against PGlite (real Postgres built from drizzle/ migrations); the app code
// itself only uses Web APIs, so the same handlers run unchanged.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.git/**'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
