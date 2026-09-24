import { createBreed, type Breed } from "@domain/breed/breed";
import type { BreedPage } from "@domain/breed/breed-page";
import { createCatFact, type CatFact } from "@domain/fact/fact";
import { breedDtoSchema, type BreedPageDto, type FactDto } from "./schemas";

export interface MappedBreedPage {
  page: BreedPage;
  /** Filas descartadas por no cumplir el esquema. */
  dropped: number;
}

export function toBreedPage(dto: BreedPageDto): MappedBreedPage {
  const breeds: Breed[] = [];
  let dropped = 0;

  for (const row of dto.data) {
    const parsed = breedDtoSchema.safeParse(row);
    if (!parsed.success) {
      dropped++;
      continue;
    }
    const { breed: name, country, origin, coat, pattern } = parsed.data;
    try {
      breeds.push(createBreed({ name, country, origin, coat, pattern }));
    } catch {
      dropped++;
    }
  }

  return {
    dropped,
    page: {
      breeds,
      page: dto.current_page,
      lastPage: dto.last_page,
      perPage: dto.per_page,
      total: dto.total,
    },
  };
}

export function toCatFact(dto: FactDto): CatFact {
  return createCatFact(dto.fact);
}
