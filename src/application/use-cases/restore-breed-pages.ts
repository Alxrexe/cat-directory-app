import type { BreedPage } from "@domain/breed/breed-page";
import type { BreedRepository, RequestOptions } from "../ports/breed-repository";
import { mapWithConcurrency, range } from "../shared/concurrency";

/** Techo para `?page=` en un enlace compartido. Evita que una URL fuerce cientos de peticiones. */
export const MAX_RESTORED_PAGES = 40;
const PARALLEL_REQUESTS = 3;

export interface RestoreBreedPagesDeps {
  breeds: BreedRepository;
}

/** Páginas 1..N para `?page=N`. La primera va sola porque dice cuántas hay. */
export function createRestoreBreedPages({ breeds }: RestoreBreedPagesDeps) {
  return async function restoreBreedPages(
    upTo: number,
    options?: RequestOptions & { cap?: number },
  ): Promise<BreedPage[]> {
    const first = await breeds.getPage(1, options);
    const requested = Number.isFinite(upTo) ? Math.floor(upTo) : first.lastPage;
    const last = Math.max(1, Math.min(requested, first.lastPage, options?.cap ?? MAX_RESTORED_PAGES));

    const rest = await mapWithConcurrency(range(2, last), PARALLEL_REQUESTS, (page) =>
      breeds.getPage(page, options),
    );
    return [first, ...rest];
  };
}
