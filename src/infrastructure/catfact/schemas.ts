import * as z from "zod/mini";

/**
 * Esquemas del contrato de catfact.ninja. Son la frontera: nada que no pase
 * por aquí entra en el dominio.
 *
 * Se usa `zod/mini` (API funcional, apta para tree-shaking): estos esquemas
 * viajan también al navegador y la variante clásica arrastra ~100 KB.
 *
 * Cada raza se valida por separado (ver el mapper): una fila rota no debe
 * tumbar la página entera. La página sí se valida entera, porque sin
 * `current_page` o `last_page` no hay paginación posible.
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
