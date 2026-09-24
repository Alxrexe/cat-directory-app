import type { FactRepository } from "@application/ports/fact-repository";
import type { HttpClient } from "../http/http-client";
import { toCatFact } from "./mappers";
import { factDtoSchema } from "./schemas";

export interface CatfactFactRepositoryConfig {
  http: HttpClient;
  baseUrl: string;
}

/** Adaptador secundario: `FactRepository` sobre GET /fact. */
export function createCatfactFactRepository(config: CatfactFactRepositoryConfig): FactRepository {
  return {
    async getRandom(options) {
      const url = new URL("/fact", config.baseUrl);
      if (options?.maxLength) url.searchParams.set("max_length", String(options.maxLength));
      const dto = await config.http.getJson(url, factDtoSchema, { signal: options?.signal });
      return toCatFact(dto);
    },
  };
}
