import * as z from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  // Same default as packages/database/prisma.config.ts: the compose Postgres published on localhost.
  DATABASE_URL: z.url().default('postgresql://erp:erp@localhost:5432/erp'),
  // Signs the session cookie. The default is fine for the workshop; set a random value anywhere real.
  AUTH_SECRET: z.string().min(32).default('dev-only-auth-secret-change-me-0123456789'),
});

export type Env = z.infer<typeof envSchema>;

/** Fail fast on startup when an environment variable is missing or invalid. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
