import type { CatFact } from "@domain/fact/fact";
import type { FactRepository, FactRequestOptions } from "../ports/fact-repository";

/** Por encima de esto el dato deja de ser "curioso" y pasa a ser un párrafo. */
export const FACT_MAX_LENGTH = 220;

export interface GetRandomFactDeps {
  facts: FactRepository;
}

export function createGetRandomFact({ facts }: GetRandomFactDeps) {
  return function getRandomFact(options?: FactRequestOptions): Promise<CatFact> {
    return facts.getRandom({ maxLength: FACT_MAX_LENGTH, ...options });
  };
}
