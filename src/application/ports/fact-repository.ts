import type { CatFact } from "@domain/fact/fact";
import type { RequestOptions } from "./breed-repository";

export interface FactRequestOptions extends RequestOptions {
  /** Longitud máxima del texto, para que quepa en la tarjeta. */
  maxLength?: number;
}

/** Puerto secundario: datos curiosos aleatorios. */
export interface FactRepository {
  getRandom(options?: FactRequestOptions): Promise<CatFact>;
}
