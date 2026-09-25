import type { BreedPage } from "@domain/breed/breed-page";
import { DataSourceError } from "@application/errors";
import type { BreedSnapshot } from "@application/ports/breed-snapshot-store";
import type { ClientContainerOptions, createClientContainer } from "./client";

type EagerClientUseCases = ReturnType<typeof createClientContainer>;

/**
 * Casos de uso del navegador tal como los ve la UI. Son los mismos que los
 * de `createClientContainer`, salvo la copia local, que es asíncrona: su
 * lectura puede esperar a que llegue la infraestructura.
 */
export interface ClientUseCases {
  listBreedsPage: EagerClientUseCases["listBreedsPage"];
  getRandomFact: EagerClientUseCases["getRandomFact"];
  firstPageSnapshot: {
    remember(page: BreedPage): void;
    recall(): Promise<BreedSnapshot | null>;
  };
}

/**
 * Raíz de composición diferida. La primera página llega del servidor, así
 * que al arrancar el navegador no necesita ni el cliente HTTP ni los
 * esquemas de Zod ni los adaptadores: se descargan (un chunk aparte) la
 * primera vez que se usa un caso de uso, o antes con `preload()` cuando el
 * navegador queda ocioso. La UI no nota la diferencia: todo ya era asíncrono.
 */
export function createLazyClientContainer(options: ClientContainerOptions = {}) {
  let container: Promise<EagerClientUseCases> | null = null;
  // La copia local no corre prisa: se guarda cuando la infraestructura ya
  // está (por uso o por la precarga en ocioso), sin adelantar la descarga.
  let pendingSnapshot: BreedPage | null = null;

  const load = () =>
    (container ??= import("./client").then(
      (module) => {
        const loaded = module.createClientContainer(options);
        if (pendingSnapshot) loaded.firstPageSnapshot.remember(pendingSnapshot);
        pendingSnapshot = null;
        return loaded;
      },
      (cause: unknown) => {
        // Sin red el chunk no llega: se olvida el intento para repetirlo
        // luego, y el fallo habla el idioma de los puertos.
        container = null;
        throw new DataSourceError("network", "No se pudo descargar el cliente de datos", { cause });
      },
    ));

  const useCases: ClientUseCases = {
    listBreedsPage: async (page, requestOptions) => (await load()).listBreedsPage(page, requestOptions),
    getRandomFact: async (requestOptions) => (await load()).getRandomFact(requestOptions),
    firstPageSnapshot: {
      remember: (page) => {
        if (!container) {
          pendingSnapshot = page;
          return;
        }
        container.then(
          (loaded) => loaded.firstPageSnapshot.remember(page),
          () => {}, // Sin copia no pasa nada: es un respaldo.
        );
      },
      recall: async () => (await load()).firstPageSnapshot.recall(),
    },
  };

  return {
    useCases,
    /** Descarga la infraestructura sin usarla todavía. */
    preload: () => {
      load().catch(() => {});
    },
  };
}
