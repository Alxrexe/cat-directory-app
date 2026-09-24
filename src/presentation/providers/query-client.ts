import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { useConnectionStore } from "../stores/connection-store";

const clearRetry = () => useConnectionStore.getState().clearRetry();

/**
 * React Query guarda el estado de servidor (páginas, datos curiosos).
 *
 * `retry: false` es deliberado: el backoff exponencial ya lo hace el
 * adaptador HTTP. Reintentar también aquí multiplicaría los intentos
 * (4 × 4 = 16 peticiones por fallo) y quemaría el límite de la API.
 *
 * `networkMode: "online"` (por defecto) pausa las peticiones mientras el
 * navegador está offline y las reanuda solas al volver la red.
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
