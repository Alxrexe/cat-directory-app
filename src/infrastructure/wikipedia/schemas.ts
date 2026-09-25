import * as z from "zod/mini";

/** Respuesta de `action=query` de la API de MediaWiki con `formatversion=2`. */
const titleMapping = z.object({ from: z.string(), to: z.string() });

const pageSchema = z.object({
  title: z.string(),
  missing: z.optional(z.boolean()),
  invalid: z.optional(z.boolean()),
  description: z.optional(z.string()),
  extract: z.optional(z.string()),
  thumbnail: z.optional(
    z.object({
      source: z.string(),
      width: z.number(),
      height: z.number(),
    }),
  ),
  langlinks: z.optional(z.array(z.object({ lang: z.string(), title: z.string() }))),
});

export const queryResponseSchema = z.object({
  query: z.optional(
    z.object({
      normalized: z.optional(z.array(titleMapping)),
      redirects: z.optional(z.array(titleMapping)),
      pages: z.optional(z.array(pageSchema)),
    }),
  ),
});

export type QueryResponse = z.infer<typeof queryResponseSchema>;
export type WikiPage = z.infer<typeof pageSchema>;
