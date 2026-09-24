import type { BreedPage } from "@domain/breed/breed-page";

export interface RequestOptions {
  signal?: AbortSignal;
}

/**
 * Puerto secundario: de dónde salen las razas.
 * Rechaza siempre con `DataSourceError` (ver application/errors).
 */
export interface BreedRepository {
  getPage(page: number, options?: RequestOptions): Promise<BreedPage>;
}
