import { systemClock } from "@application/ports/clock";
import { createFirstPageSnapshot } from "@application/use-cases/first-page-snapshot";
import { createGetRandomFact } from "@application/use-cases/get-random-fact";
import { createListBreedsPage } from "@application/use-cases/list-breeds-page";
import { createCatfactBreedRepository } from "../catfact/catfact-breed-repository";
import { createCatfactFactRepository } from "../catfact/catfact-fact-repository";
import { CATFACT_BASE_URL } from "../catfact/config";
import { createHttpClient, type HttpClientConfig } from "../http/http-client";
import { createLocalStorageSnapshotStore } from "../storage/local-storage-snapshot-store";

export interface ClientContainerOptions {
  /** La UI se entera de cada reintento para poder decir "reintentando 2 de 3". */
  onRetry?: HttpClientConfig["onRetry"];
}

/**
 * Raíz de composición del navegador. La crea el proveedor de React una vez
 * por sesión y la reparte por contexto, así que un test puede sustituir
 * cualquier caso de uso sin tocar módulos.
 */
export function createClientContainer(options: ClientContainerOptions = {}) {
  const http = createHttpClient({
    timeoutMs: 8000,
    retry: { retries: 3, baseDelayMs: 600, maxDelayMs: 5000 },
    isOnline: () => typeof navigator === "undefined" || navigator.onLine,
    onRetry: options.onRetry,
  });

  const breeds = createCatfactBreedRepository({ http, baseUrl: CATFACT_BASE_URL });
  const facts = createCatfactFactRepository({ http, baseUrl: CATFACT_BASE_URL });
  const snapshots = createLocalStorageSnapshotStore(() =>
    typeof window === "undefined" ? undefined : window.localStorage,
  );

  return {
    listBreedsPage: createListBreedsPage({ breeds }),
    getRandomFact: createGetRandomFact({ facts }),
    firstPageSnapshot: createFirstPageSnapshot({ snapshots, clock: systemClock }),
  };
}

export type ClientUseCases = ReturnType<typeof createClientContainer>;
