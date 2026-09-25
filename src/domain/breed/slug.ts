/** La API no expone ids: el slug se deriva del nombre, igual en servidor y cliente. */
export type BreedSlug = string & { readonly __brand: "BreedSlug" };

// Letras que NFD no descompone y que, sin este mapa, desaparecerían del slug.
const LIGATURES: Record<string, string> = { æ: "ae", œ: "oe", ø: "o", ß: "ss", ð: "d", þ: "th" };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function toBreedSlug(name: string): BreedSlug {
  const slug = name
    .toLowerCase()
    .replace(/[æœøßðþ]/g, (char) => LIGATURES[char] ?? char)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug as BreedSlug;
}

export function isBreedSlug(value: string): value is BreedSlug {
  return value.length <= 120 && SLUG_PATTERN.test(value);
}
