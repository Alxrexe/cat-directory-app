import type { Breed } from "./breed";

/** Una página del directorio, con lo necesario para decidir si hay más. */
export interface BreedPage {
  readonly breeds: readonly Breed[];
  readonly page: number;
  readonly lastPage: number;
  readonly perPage: number;
  readonly total: number;
}

export function hasNextPage(page: BreedPage): boolean {
  return page.page < page.lastPage;
}

/** Posición absoluta (1-based) de un elemento dentro del directorio completo. */
export function absolutePosition(page: BreedPage, indexInPage: number): number {
  return (page.page - 1) * page.perPage + indexInPage + 1;
}

/** Página en la que cae una posición absoluta (1-based). */
export function pageOfPosition(position: number, perPage: number): number {
  return Math.max(1, Math.ceil(position / Math.max(1, perPage)));
}
