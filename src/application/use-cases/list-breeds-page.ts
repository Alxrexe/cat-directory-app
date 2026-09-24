import type { BreedPage } from "@domain/breed/breed-page";
import type { BreedRepository, RequestOptions } from "../ports/breed-repository";

export interface ListBreedsPageDeps {
  breeds: BreedRepository;
}

/** Una página del directorio. Es lo que pide el infinite scroll. */
export function createListBreedsPage({ breeds }: ListBreedsPageDeps) {
  return function listBreedsPage(page: number, options?: RequestOptions): Promise<BreedPage> {
    if (!Number.isInteger(page) || page < 1) {
      return Promise.reject(new RangeError(`Página fuera de rango: ${page}`));
    }
    return breeds.getPage(page, options);
  };
}
