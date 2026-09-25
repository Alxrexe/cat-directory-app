import type { Breed } from "./breed";

/** El pelaje llega escrito de quince maneras ("Semi Long", "Semi-long"...): se reduce a familias. */
export type CoatFamily = "short" | "semi-long" | "long" | "mixed" | "rex" | "hairless" | "unknown";

export const COAT_FAMILIES: readonly CoatFamily[] = [
  "short",
  "semi-long",
  "long",
  "mixed",
  "rex",
  "hairless",
  "unknown",
];

export function coatFamily(coat: string | null): CoatFamily {
  if (!coat) return "unknown";
  const value = coat.toLowerCase();

  if (value.includes("rex")) return "rex";
  if (value.includes("hairless")) return "hairless";
  if (value.includes("/") || value === "all") return "mixed";
  if (value.includes("semi") || value === "medium") return "semi-long";
  if (value.includes("long")) return "long";
  if (value.includes("short")) return "short";
  return "unknown";
}

export interface CoatShare {
  readonly family: CoatFamily;
  readonly count: number;
}

export function coatDistribution(breeds: readonly Breed[]): readonly CoatShare[] {
  const counts = new Map<CoatFamily, number>();
  for (const breed of breeds) {
    const family = coatFamily(breed.coat);
    counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  return COAT_FAMILIES.filter((family) => counts.has(family)).map((family) => ({
    family,
    count: counts.get(family) ?? 0,
  }));
}
