import type { BreedPage } from "@domain/breed/breed-page";

export interface RequestOptions {
  signal?: AbortSignal;
}

/** Rechaza siempre con `DataSourceError`. */
export interface BreedRepository {
  getPage(page: number, options?: RequestOptions): Promise<BreedPage>;
}
