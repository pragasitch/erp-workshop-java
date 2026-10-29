import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { clearSession, isUnauthorized } from '@/lib/auth';

export function createQueryClient() {
  // Any 401 (e.g. the session cookie expired) signs the user out, which sends them to /login.
  const onError = (error: unknown) => {
    if (isUnauthorized(error)) clearSession(queryClient);
  };

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => !isUnauthorized(error) && failureCount < 1,
        refetchOnWindowFocus: false,
      },
    },
  });
  return queryClient;
}
