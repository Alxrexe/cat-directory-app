import type { BreedRepository } from "@application/ports/breed-repository";
import type { HttpClient } from "../http/http-client";
import { toBreedPage } from "./mappers";
import { breedPageDtoSchema } from "./schemas";

export interface CatfactBreedRepositoryConfig {
  http: HttpClient;
  baseUrl: string;
  /** Tamaño de página. Sin valor se usa el de la API (25). */
  pageSize?: number;
  onDroppedRows?: (count: number, page: number) => void;
}

/** Adaptador secundario: `BreedRepository` sobre GET /breeds. */
export function createCatfactBreedRepository(config: CatfactBreedRepositoryConfig): BreedRepository {
  return {
    async getPage(page, options) {
      const url = new URL("/breeds", config.baseUrl);
      url.searchParams.set("page", String(page));
      if (config.pageSize) url.searchParams.set("limit", String(config.pageSize));

      const dto = await config.http.getJson(url, breedPageDtoSchema, options);
      const { page: mapped, dropped } = toBreedPage(dto);
      if (dropped > 0) config.onDroppedRows?.(dropped, page);
      return mapped;
    },
  };
}
