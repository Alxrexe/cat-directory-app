import "server-only";
import { cache } from "react";
import { createGetBreedDossier } from "@application/use-cases/get-breed-dossier";
import { createRestoreBreedPages } from "@application/use-cases/restore-breed-pages";
import { createCatfactBreedRepository } from "../catfact/catfact-breed-repository";
import { BREEDS_REVALIDATE_SECONDS, CATFACT_BASE_URL } from "../catfact/config";
import { createHttpClient } from "../http/http-client";
import { createWikipediaProfileRepository } from "../wikipedia/wikipedia-profile-repository";

/**
 * Raíz de composición del servidor. Las páginas de la API quedan en la caché
 * de datos de Next (revalidate), y aquí se reintenta menos que en el cliente:
 * el primer byte no puede esperar a un backoff largo.
 */
const http = createHttpClient({
  timeoutMs: 6000,
  retry: { retries: 3, baseDelayMs: 300, maxDelayMs: 2000 },
  requestInit: { next: { revalidate: BREEDS_REVALIDATE_SECONDS, tags: ["catfact"] } },
});

const breeds = createCatfactBreedRepository({
  http,
  baseUrl: CATFACT_BASE_URL,
  onDroppedRows: (count, page) => console.warn(`[catfact] página ${page}: ${count} filas descartadas por esquema`),
});

// Wikipedia exige User-Agent propio y limita ráfagas: en serie, cacheado un día.
const wikipediaHttp = createHttpClient({
  timeoutMs: 8000,
  retry: { retries: 3, baseDelayMs: 800, maxDelayMs: 4000 },
  requestInit: {
    headers: { "User-Agent": "cat-directory-app/1.0 (https://github.com/Alxrexe/cat-directory-app)" },
    next: { revalidate: 86400, tags: ["wikipedia"] },
  },
});

const profiles = createWikipediaProfileRepository({ http: wikipediaHttp });

const restoreBreedPages = createRestoreBreedPages({ breeds });
const { getBreedDossier, loadCatalog, loadProfiles } = createGetBreedDossier({
  restoreBreedPages,
  profiles,
  onProfilesError: (error) => console.warn("[wikipedia] perfiles no disponibles:", error),
});

/** `cache` deduplica por petición: metadata y página comparten un solo recorrido. */
export const serverUseCases = {
  restoreBreedPages: cache((upTo: number) => restoreBreedPages(upTo)),
  getBreedDossier: cache((slug: string) => getBreedDossier(slug)),
  loadCatalog: cache(() => loadCatalog()),
  /** Calienta la caché de perfiles antes de generar las 98 fichas en paralelo. */
  warmProfiles: cache(async () => loadProfiles(await loadCatalog())),
};
