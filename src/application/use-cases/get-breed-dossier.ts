import type { Breed } from "@domain/breed/breed";
import { coatDistribution, type CoatShare } from "@domain/breed/coat";
import { relatedBreeds } from "@domain/breed/related";
import { isBreedSlug } from "@domain/breed/slug";
import type { BreedPage } from "@domain/breed/breed-page";
import type { BreedPhoto, BreedProfile } from "@domain/breed/profile";
import type { RequestOptions } from "../ports/breed-repository";
import type { BreedProfileRepository } from "../ports/breed-profile-repository";

export interface BreedDossier {
  readonly breed: Breed;
  /** 1-based. */
  readonly position: number;
  readonly total: number;
  readonly previous: Breed | null;
  readonly next: Breed | null;
  readonly related: readonly Breed[];
  readonly coats: readonly CoatShare[];
  readonly profile: BreedProfile | null;
  readonly relatedPhotos: Readonly<Record<string, BreedPhoto | null>>;
}

/** Techo de páginas al recorrer el catálogo entero. */
const CATALOG_PAGE_CAP = 200;

export interface GetBreedDossierDeps {
  restoreBreedPages: (upTo: number, options?: RequestOptions & { cap?: number }) => Promise<BreedPage[]>;
  profiles?: BreedProfileRepository;
  onProfilesError?: (error: unknown) => void;
}

/**
 * La API no tiene endpoint por raza, así que se recorre el listado. Corre en
 * el servidor, con cada página en la caché de datos de Next.
 */
export function createGetBreedDossier({ restoreBreedPages, profiles, onProfilesError }: GetBreedDossierDeps) {
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
    const related = relatedBreeds(breed, catalog);
    const profileMap = await loadProfiles(catalog, options);

    return {
      breed,
      position: index + 1,
      total: catalog.length,
      previous: catalog[index - 1] ?? null,
      next: catalog[index + 1] ?? null,
      related,
      coats: coatDistribution(catalog),
      profile: profileMap.get(breed.name) ?? null,
      relatedPhotos: Object.fromEntries(related.map((item) => [item.slug, profileMap.get(item.name)?.photo ?? null])),
    };
  }

  // Perfiles del catálogo entero de una vez (la fuente trabaja por lotes).
  // Si fallan, la ficha sale igual, sin foto.
  async function loadProfiles(catalog: readonly Breed[], options?: RequestOptions) {
    if (!profiles) return new Map<string, BreedProfile>();
    try {
      return await profiles.getProfiles(
        catalog.map((breed) => breed.name),
        options,
      );
    } catch (error) {
      onProfilesError?.(error);
      return new Map<string, BreedProfile>();
    }
  }

  return { getBreedDossier, loadCatalog, loadProfiles };
}
