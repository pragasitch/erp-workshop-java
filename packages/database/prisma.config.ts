import { defineConfig } from 'prisma/config';

// Load the repo-root .env when running Prisma on your machine.
// Variables that are already set (e.g. by docker compose) always win.
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  // No .env file: fall back to the defaults below.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://erp:erp@localhost:5432/erp',
  },
});
