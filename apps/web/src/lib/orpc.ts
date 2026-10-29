import { check, login, logout, me } from '@erp/contracts';

/**
 * Thin adapter that keeps the old call sites working on top of the generated
 * client. Each leaf exposes `queryOptions` / `mutationOptions` / `queryKey`,
 * and unwraps Orval's `{ data }` response so callers get the body directly.
 *
 * The contract itself is generated from the Java API's OpenAPI spec; this file
 * only shapes the TanStack Query helpers the app already uses.
 */
export const orpc = {
  health: {
    check: {
      queryKey: () => ['health', 'check'] as const,
      queryOptions: () => ({
        queryKey: ['health', 'check'] as const,
        queryFn: async () => (await check()).data,
      }),
    },
  },
  auth: {
    me: {
      queryKey: () => ['auth', 'me'] as const,
      queryOptions: (options?: { staleTime?: number }) => ({
        queryKey: ['auth', 'me'] as const,
        queryFn: async () => (await me()).data,
        ...options,
      }),
    },
    login: {
      mutationOptions: (options?: {
        onSuccess?: (user: Awaited<ReturnType<typeof login>>['data']) => void;
      }) => ({
        mutationFn: async (input: { email: string; password: string }) =>
          (await login(input)).data,
        onSuccess: options?.onSuccess,
      }),
    },
    logout: {
      mutationOptions: (options?: { onSuccess?: () => void }) => ({
        mutationFn: async (_input?: Record<string, never>) => {
          await logout();
        },
        onSuccess: options?.onSuccess,
      }),
    },
  },
};
