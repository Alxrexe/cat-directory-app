import type { Breed } from "@domain/breed/breed";
import { coatDistribution, type CoatShare } from "@domain/breed/coat";
import { relatedBreeds } from "@domain/breed/related";
import { isBreedSlug } from "@domain/breed/slug";
import type { BreedPage } from "@domain/breed/breed-page";
import type { RequestOptions } from "../ports/breed-repository";

/** Todo lo que la vista de detalle necesita de una raza. */
export interface BreedDossier {
  readonly breed: Breed;
  /** Posición 1-based en el directorio. */
  readonly position: number;
  readonly total: number;
  readonly previous: Breed | null;
  readonly next: Breed | null;
  readonly related: readonly Breed[];
  readonly coats: readonly CoatShare[];
}

/** Techo de páginas al recorrer el catálogo entero. */
const CATALOG_PAGE_CAP = 200;

export interface GetBreedDossierDeps {
  restoreBreedPages: (upTo: number, options?: RequestOptions & { cap?: number }) => Promise<BreedPage[]>;
}

/**
 * La API no tiene endpoint por raza: la única forma de encontrar una es
 * recorrer el listado. Este caso de uso vive en el servidor, donde cada
 * página queda en la caché de datos de Next, así que recorrerlas cuesta una
 * vez por periodo de revalidación y no una vez por visita.
 */
export function createGetBreedDossier({ restoreBreedPages }: GetBreedDossierDeps) {
  async function loadCatalog(options?: RequestOptions): Promise<readonly Breed[]> {
    const pages = await restoreBreedPages(Number.POSITIVE_INFINITY, { ...options, cap: CATALOG_PAGE_CAP });
    return pages.flatMap((page) => page.breeds);
  }

  async function getBreedDossier(slug: string, options?: RequestOptions): Promise<BreedDossier | null> {
    if (!isBreedSlug(slug)) return null;

    const catalog = await loadCatalog(options);
    const index = catalog.findIndex((breed) => breed.slug === slug);
    if (index === -1) return null;

    const breed = catalog[index];
    return {
      breed,
      position: index + 1,
      total: catalog.length,
      previous: catalog[index - 1] ?? null,
      next: catalog[index + 1] ?? null,
      related: relatedBreeds(breed, catalog),
      coats: coatDistribution(catalog),
    };
  }

  return { getBreedDossier, loadCatalog };
}
