import { isFamilyFriendly, type CatFact } from "@domain/fact/fact";
import type { FactRepository, FactRequestOptions } from "../ports/fact-repository";

/** Por encima de esto el dato deja de ser "curioso" y pasa a ser un párrafo. */
export const FACT_MAX_LENGTH = 220;

/** Datos que se piden como mucho hasta dar con uno apto para todos. */
export const FACT_DRAWS = 4;

export interface GetRandomFactDeps {
  facts: FactRepository;
}

export function createGetRandomFact({ facts }: GetRandomFactDeps) {
  return async function getRandomFact(options?: FactRequestOptions): Promise<CatFact> {
    let fact = await facts.getRandom({ maxLength: FACT_MAX_LENGTH, ...options });
    // Un dato no apto sale ~2 de cada 100 veces: se pide otro. Tras
    // FACT_DRAWS intentos se muestra el último antes que dejar el LCD vacío.
    for (let draw = 1; draw < FACT_DRAWS && !isFamilyFriendly(fact); draw++) {
      fact = await facts.getRandom({ maxLength: FACT_MAX_LENGTH, ...options });
    }
    return fact;
  };
}
