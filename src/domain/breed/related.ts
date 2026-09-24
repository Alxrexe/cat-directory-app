import type { Breed } from "./breed";
import { coatFamily } from "./coat";
import { describeCountry } from "./country";

/**
 * Razas emparentadas con otra: primero las del mismo país, luego las que
 * comparten familia de pelaje. Nunca incluye a la propia raza.
 */
export function relatedBreeds(target: Breed, catalog: readonly Breed[], limit = 8): readonly Breed[] {
  const country = describeCountry(target.country)?.primary.toLowerCase() ?? null;
  const family = coatFamily(target.coat);

  const score = (breed: Breed): number => {
    let value = 0;
    if (country && describeCountry(breed.country)?.primary.toLowerCase() === country) value += 2;
    if (family !== "unknown" && coatFamily(breed.coat) === family) value += 1;
    return value;
  };

  return catalog
    .filter((breed) => breed.slug !== target.slug)
    .map((breed) => ({ breed, score: score(breed) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.breed.name.localeCompare(b.breed.name))
    .slice(0, limit)
    .map(({ breed }) => breed);
}
