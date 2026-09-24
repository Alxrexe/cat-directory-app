import { infiniteQueryOptions, type InfiniteData } from "@tanstack/react-query";
import { hasNextPage, type BreedPage } from "@domain/breed/breed-page";
import type { ClientUseCases } from "@infrastructure/container/client";

export const BREEDS_QUERY_KEY = ["breeds", "directory"] as const;

export type BreedPagesData = InfiniteData<BreedPage, number>;

/** Definición única de la consulta paginada: la usan el directorio y la paleta ⌘K. */
export function breedsQueryOptions(listBreedsPage: ClientUseCases["listBreedsPage"]) {
  return infiniteQueryOptions({
    queryKey: BREEDS_QUERY_KEY,
    queryFn: ({ pageParam, signal }) => listBreedsPage(pageParam, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last: BreedPage) => (hasNextPage(last) ? last.page + 1 : undefined),
  });
}

export function toPagesData(pages: readonly BreedPage[]): BreedPagesData {
  return { pages: [...pages], pageParams: pages.map((page) => page.page) };
}
