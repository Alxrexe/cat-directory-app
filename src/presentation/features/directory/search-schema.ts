import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/mini";
import { SEARCH_MAX_LENGTH } from "../../lib/directory-params";

/**
 * Esquema del buscador. Vive en su propio módulo para que Zod se descargue
 * al empezar a escribir y no con el primer pintado (ver search-field.tsx).
 */
export const searchSchema = z.object({
  q: z.string().check(z.maxLength(SEARCH_MAX_LENGTH, `Máximo ${SEARCH_MAX_LENGTH} caracteres`)),
});

export type SearchValues = z.infer<typeof searchSchema>;

export const searchResolver = zodResolver(searchSchema);

/** El texto listo para publicarse en la URL, o `null` si no es válido. */
export function parseSearch(query: string): string | null {
  const parsed = searchSchema.safeParse({ q: query });
  return parsed.success ? parsed.data.q.trim() : null;
}
