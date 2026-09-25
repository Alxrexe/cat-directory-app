import type { BreedProfile } from "@domain/breed/profile";
import type { RequestOptions } from "./breed-repository";

/**
 * Puerto secundario: foto y resumen de cada raza. Trabaja por lotes porque
 * la fuente real (Wikipedia) limita las ráfagas: pedir 98 razas de una en
 * una termina en 429, pedirlas en lotes de 50 son cuatro peticiones.
 *
 * Devuelve un mapa nombre de raza → perfil; las razas sin perfil no aparecen.
 */
export interface BreedProfileRepository {
  getProfiles(breedNames: readonly string[], options?: RequestOptions): Promise<ReadonlyMap<string, BreedProfile>>;
}
