import * as z from "zod/mini";

/**
 * Frontera con catfact.ninja. `zod/mini` porque también viaja al navegador.
 * Cada raza se valida por separado: una fila rota no tumba la página.
 */
const text = z.pipe(
  z.nullish(z.string()),
  z.transform((value) => value ?? ""),
);
const positiveInt = z.pipe(z.coerce.number(), z.int().check(z.positive()));
const nonNegativeInt = z.pipe(z.coerce.number(), z.int().check(z.nonnegative()));

export const breedDtoSchema = z.object({
  breed: z.string().check(z.minLength(1)),
  country: text,
  origin: text,
  coat: text,
  pattern: text,
});
export type BreedDto = z.infer<typeof breedDtoSchema>;

export const breedPageDtoSchema = z.object({
  current_page: positiveInt,
  last_page: positiveInt,
  per_page: positiveInt,
  total: nonNegativeInt,
  data: z.array(z.unknown()),
});
export type BreedPageDto = z.infer<typeof breedPageDtoSchema>;

export const factDtoSchema = z.object({
  fact: z.string().check(z.minLength(1)),
  length: z.optional(nonNegativeInt),
});
export type FactDto = z.infer<typeof factDtoSchema>;
