import type { BreedProfile } from "@domain/breed/profile";
import type { RequestOptions } from "./breed-repository";

/** Por lotes: Wikipedia responde 429 a las ráfagas. Las razas sin perfil no aparecen. */
export interface BreedProfileRepository {
  getProfiles(breedNames: readonly string[], options?: RequestOptions): Promise<ReadonlyMap<string, BreedProfile>>;
}
