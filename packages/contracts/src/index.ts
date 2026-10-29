/**
 * The TypeScript face of the HTTP API, generated from the Java API's OpenAPI
 * spec (openapi.json). Java owns the contract; do not hand-edit src/generated.
 *
 * - apps/web calls the generated TanStack Query hooks (useLogin, useMe, ...).
 * - Regenerate with `pnpm --filter @erp/contracts generate` after the spec changes.
 */

export * from './generated/model';
export * from './generated/auth/auth';
export * from './generated/health/health';
export { apiFetch, ApiError } from './fetcher';

// The old contract exposed the signed-in user as `User`. Keep that name.
export type { UserDto as User } from './generated/model';
