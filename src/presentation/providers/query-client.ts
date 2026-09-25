import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { useConnectionStore } from "../stores/connection-store";

const clearRetry = () => useConnectionStore.getState().clearRetry();

/**
 * `retry: false`: el backoff ya lo hace el cliente HTTP; reintentar también
 * aquí serían 16 peticiones por fallo.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onSettled: clearRetry }),
    mutationCache: new MutationCache({ onSettled: clearRetry }),
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}
