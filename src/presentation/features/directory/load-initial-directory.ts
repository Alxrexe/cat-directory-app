import "server-only";
import type { BreedPage } from "@domain/breed/breed-page";
import { serializeError, type SerializedDataSourceError } from "@application/errors";
import { serverUseCases } from "@infrastructure/container/server";

export interface InitialDirectory {
  pages: BreedPage[];
  error: SerializedDataSourceError | null;
  renderedAt: number;
}

/** Si la API falla, la página sale vacía con el motivo y el cliente toma el relevo. */
export async function loadInitialDirectory(upToPage: number): Promise<InitialDirectory> {
  try {
    const pages = await serverUseCases.restoreBreedPages(upToPage);
    return { pages, error: null, renderedAt: Date.now() };
  } catch (error) {
    console.error("[directorio] SSR sin datos:", error);
    return { pages: [], error: serializeError(error), renderedAt: Date.now() };
  }
}
