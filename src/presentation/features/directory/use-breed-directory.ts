"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useEffectEvent, useMemo, useState } from "react";
import type { Breed } from "@domain/breed/breed";
import { absolutePosition, type BreedPage } from "@domain/breed/breed-page";
import type { BreedSnapshot } from "@application/ports/breed-snapshot-store";
import { useUseCases } from "../../providers/use-cases-provider";
import { useHydrated } from "../../hooks/use-hydrated";
import { useConnectionStore } from "../../stores/connection-store";
import { BREEDS_QUERY_KEY, breedsQueryOptions, toPagesData, type BreedPagesData } from "./breeds-query";

export interface DirectoryEntry {
  readonly breed: Breed;
  readonly name: string;
  /** Posición 1-based en el directorio completo. */
  readonly position: number;
  /** Página de la API de la que salió. */
  readonly page: number;
}

/** De dónde sale lo que se pinta: la red, la copia local o nada todavía. */
export type DirectorySource = "live" | "snapshot" | "empty";

export type RefreshResult = { ok: true; total: number } | { ok: false; error: unknown };

interface Options {
  /** Páginas resueltas en el servidor (vacío si la API falló durante el SSR). */
  initialPages: readonly BreedPage[];
  /** Momento del render en el servidor: marca la edad de `initialPages`. */
  renderedAt: number;
}

export function useBreedDirectory({ initialPages, renderedAt }: Options) {
  const { listBreedsPage, firstPageSnapshot } = useUseCases();
  const queryClient = useQueryClient();
  const online = useConnectionStore((state) => state.online);
  const hasServerData = initialPages.length > 0;

  const query = useInfiniteQuery({
    ...breedsQueryOptions(listBreedsPage),
    initialData: hasServerData ? toPagesData(initialPages) : undefined,
    initialDataUpdatedAt: hasServerData ? renderedAt : undefined,
  });

  // ── Copia local ────────────────────────────────────────────────────────
  // Solo se consulta si el servidor no pudo traer datos. Se lee después de
  // hidratar: leerla antes daría un HTML distinto al del SSR. Si hay datos
  // en vivo, mandan ellos (ver `pages`), así que no hace falta descartarla.
  const hydrated = useHydrated();
  const { data: snapshot = null } = useQuery<BreedSnapshot | null>({
    queryKey: ["first-page-snapshot"],
    queryFn: () => firstPageSnapshot.recall(),
    enabled: hydrated && !hasServerData,
    // Es localStorage: ni caduca ni depende de la red.
    staleTime: Number.POSITIVE_INFINITY,
    networkMode: "always",
    retry: false,
  });

  const firstPage = query.data?.pages[0];
  useEffect(() => {
    if (firstPage) firstPageSnapshot.remember(firstPage);
  }, [firstPage, firstPageSnapshot]);

  // ── Reconexión ─────────────────────────────────────────────────────────
  // React Query reanuda solo lo que quedó en pausa; lo que llegó a fallar
  // (p. ej. tras agotar los reintentos) se relanza aquí al volver la red.
  const resumeAfterReconnect = useEffectEvent(() => {
    if (query.isFetchNextPageError) void query.fetchNextPage();
    else if (!query.data && query.isError) void query.refetch();
  });
  useEffect(() => {
    if (online) resumeAfterReconnect();
  }, [online]);

  // ── Entradas planas para la lista ──────────────────────────────────────
  const pages = useMemo(
    () => query.data?.pages ?? (snapshot ? [snapshot.page] : []),
    [query.data, snapshot],
  );
  const entries = useMemo<DirectoryEntry[]>(
    () =>
      pages.flatMap((page) =>
        page.breeds.map((breed, index) => ({
          breed,
          name: breed.name,
          position: absolutePosition(page, index),
          page: page.page,
        })),
      ),
    [pages],
  );

  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const retryNextPage = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  // ── Recargar desde la página 1 ─────────────────────────────────────────
  // La lista actual no se toca hasta tener la página nueva: si la recarga
  // falla, el usuario conserva todo lo que ya tenía.
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async (): Promise<RefreshResult> => {
    setRefreshing(true);
    try {
      await queryClient.cancelQueries({ queryKey: BREEDS_QUERY_KEY });
      const fresh = await listBreedsPage(1);
      queryClient.setQueryData<BreedPagesData>(BREEDS_QUERY_KEY, toPagesData([fresh]));
      return { ok: true, total: fresh.total };
    } catch (error) {
      return { ok: false, error };
    } finally {
      setRefreshing(false);
      useConnectionStore.getState().clearRetry();
    }
  }, [queryClient, listBreedsPage]);

  const source: DirectorySource = query.data ? "live" : snapshot ? "snapshot" : "empty";

  return {
    entries,
    source,
    snapshotSavedAt: snapshot?.savedAt ?? null,
    total: pages[0]?.total ?? 0,
    lastPage: pages[0]?.lastPage ?? 1,
    loadedPages: pages.length,
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    isPaused: query.fetchStatus === "paused",
    isInitialLoading: !query.data && query.isFetching,
    nextPageError: isFetchNextPageError ? query.error : null,
    initialError: !query.data && query.isError ? query.error : null,
    loadMore,
    retryNextPage,
    retryInitial: query.refetch,
    refresh,
    refreshing,
  };
}

export type BreedDirectory = ReturnType<typeof useBreedDirectory>;
