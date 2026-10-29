import { contract } from '@erp/contracts';
import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import type { JsonifiedClient } from '@orpc/openapi-client';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';

// Calls go to /api on the same origin; Vite proxies them to the NestJS API.
const link = new OpenAPILink(contract, {
  url: () => `${window.location.origin}/api`,
  // Look up fetch on every call so tests can stub it with vi.stubGlobal('fetch', ...).
  fetch: (request, init) => globalThis.fetch(request, init),
});

/** Fully typed client generated from the shared contract. */
export const client: JsonifiedClient<ContractRouterClient<typeof contract>> =
  createORPCClient(link);

/** TanStack Query helpers, e.g. `useQuery(orpc.health.check.queryOptions())`. */
export const orpc = createTanstackQueryUtils(client);
