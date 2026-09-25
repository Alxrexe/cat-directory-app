import { toBreedSlug, type BreedSlug } from "./slug";

/** La API manda cadenas vacías para lo que no sabe; aquí son `null`. */
export interface Breed {
  readonly slug: BreedSlug;
  readonly name: string;
  readonly country: string | null;
  readonly origin: string | null;
  readonly coat: string | null;
  readonly pattern: string | null;
}

export interface BreedProps {
  name: string;
  country?: string | null;
  origin?: string | null;
  coat?: string | null;
  pattern?: string | null;
}

export class InvalidBreedError extends Error {
  constructor(reason: string) {
    super(`Raza inválida: ${reason}`);
    this.name = "InvalidBreedError";
  }
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed : null;
}

export function createBreed(props: BreedProps): Breed {
  const name = blankToNull(props.name);
  if (!name) throw new InvalidBreedError("el nombre está vacío");

  const slug = toBreedSlug(name);
  if (!slug) throw new InvalidBreedError(`"${name}" no produce un identificador`);

  return Object.freeze({
    slug,
    name,
    country: blankToNull(props.country),
    origin: blankToNull(props.origin),
    coat: blankToNull(props.coat),
    pattern: blankToNull(props.pattern),
  });
}
