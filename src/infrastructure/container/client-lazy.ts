import type { BreedPage } from "@domain/breed/breed-page";
import { DataSourceError } from "@application/errors";
import type { BreedSnapshot } from "@application/ports/breed-snapshot-store";
import type { ClientContainerOptions, createClientContainer } from "./client";

type EagerClientUseCases = ReturnType<typeof createClientContainer>;

export interface ClientUseCases {
  listBreedsPage: EagerClientUseCases["listBreedsPage"];
  getRandomFact: EagerClientUseCases["getRandomFact"];
  firstPageSnapshot: {
    remember(page: BreedPage): void;
    recall(): Promise<BreedSnapshot | null>;
  };
}

/**
 * Raíz de composición diferida: la primera página llega del servidor, así que
 * el cliente HTTP, Zod y los adaptadores se descargan al primer uso.
 */
export function createLazyClientContainer(options: ClientContainerOptions = {}) {
  let container: Promise<EagerClientUseCases> | null = null;
  // Guardar la copia local no justifica adelantar la descarga.
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
        // Sin red el chunk no llega: se reintenta luego y se falla como un puerto.
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
    preload: () => {
      load().catch(() => {});
    },
  };
}
