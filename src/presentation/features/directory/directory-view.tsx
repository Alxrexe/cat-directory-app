"use client";

import { RotateCw, ServerCrash } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filterByName } from "@domain/breed/search";
import type { BreedPage } from "@domain/breed/breed-page";
import type { SerializedDataSourceError } from "@application/errors";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Hint } from "../../components/ui/hint";
import { useDirectoryUrlState } from "../../hooks/use-directory-url-state";
import { cn } from "../../lib/cn";
import { directorySearch } from "../../lib/directory-params";
import { describeError } from "../../lib/error-copy";
import { padIndex } from "../../lib/format";
import { playCue } from "../../lib/sound";
import { useNavigationStore } from "../../stores/navigation-store";
import { BreedList, type BreedListHandle } from "./breed-list";
import { EmptyResults, ListFooter, RowSkeletons, SnapshotBanner } from "./list-status";
import { PullToRefresh } from "./pull-to-refresh";
import { SearchField, type SearchFieldHandle } from "./search-field";
import { useBreedDirectory } from "./use-breed-directory";
import { notify } from "../../lib/notify";

interface DirectoryViewProps {
  initialPages: readonly BreedPage[];
  /** El SSR no pudo traer datos: el cliente lo intenta por su cuenta. */
  serverError: SerializedDataSourceError | null;
  renderedAt: number;
}

const LIST_ID = "breed-list";

export function DirectoryView({ initialPages, serverError, renderedAt }: DirectoryViewProps) {
  const directory = useBreedDirectory({ initialPages, renderedAt });
  const { params, setQuery, setPage } = useDirectoryUrlState();
  const [restorePage] = useState(params.page);

  const setDirectoryHref = useNavigationStore((state) => state.setDirectoryHref);
  const setLastVisited = useNavigationStore((state) => state.setLastVisited);
  const [lastVisitedSlug] = useState(() => useNavigationStore.getState().lastVisitedSlug);

  const listRef = useRef<BreedListHandle>(null);
  const searchRef = useRef<SearchFieldHandle>(null);

  const query = params.q;
  const filterActive = query.length > 0;
  const results = useMemo(() => filterByName(directory.entries, query), [directory.entries, query]);
  const loaded = directory.entries.length;
  const nextPage = directory.loadedPages + 1;

  useEffect(() => {
    setDirectoryHref(`/${directorySearch(params)}`);
  }, [params, setDirectoryHref]);

  // "/" lleva al buscador desde cualquier parte de la página.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Los fallos definitivos (tras agotar los reintentos) también se avisan
  // fuera de la lista: puede que el usuario no esté mirando el final.
  const { nextPageError, initialError, retryNextPage, retryInitial } = directory;
  useEffect(() => {
    if (!nextPageError) return;
    const copy = describeError(nextPageError);
    playCue("error");
    notify.error(`Página ${nextPage}: ${copy.title}`, {
      description: copy.description,
      action: { label: "Reintentar", onClick: retryNextPage },
    });
  }, [nextPageError, nextPage, retryNextPage]);

  useEffect(() => {
    if (!initialError) return;
    const copy = describeError(initialError);
    playCue("error");
    notify.error(copy.title, {
      description: copy.description,
      action: { label: "Reintentar", onClick: () => void retryInitial() },
    });
  }, [initialError, retryInitial]);

  const { refresh } = directory;
  const onRefresh = useCallback(
    async function run(): Promise<void> {
      const result = await refresh();
      if (result.ok) {
        playCue("success");
        notify.success("Directorio actualizado", {
          description: `Página 1 recargada · ${result.total} razas en total`,
        });
        window.scrollTo({ top: 0 });
        setPage(1);
        return;
      }
      const copy = describeError(result.error);
      playCue("error");
      notify.error(`No se pudo recargar: ${copy.title}`, {
        description: `${copy.description} Conservas la lista que ya tenías.`,
        action: { label: "Reintentar", onClick: () => void run() },
      });
    },
    [refresh, setPage],
  );

  const onOpen = useCallback((slug: string) => setLastVisited(slug), [setLastVisited]);
  const onExitTop = useCallback(() => searchRef.current?.focus(), []);
  const enterList = useCallback(() => listRef.current?.focusRow(0), []);
  const clearQuery = useCallback(() => searchRef.current?.clear(), []);

  const emptyFilter = filterActive && loaded > 0 && results.length === 0;
  const counter = filterActive
    ? `${results.length} de ${loaded} cargadas`
    : `${padIndex(loaded)} / ${padIndex(directory.total)} razas`;
  const announcement = filterActive
    ? `${results.length} ${results.length === 1 ? "raza coincide" : "razas coinciden"} con ${query}`
    : loaded > 0
      ? `${loaded} de ${directory.total} razas cargadas`
      : "";

  return (
    <PullToRefresh onRefresh={onRefresh} refreshing={directory.refreshing}>
      <section aria-labelledby="directory-heading" className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <h2 id="directory-heading" className="sr-only">
          Listado de razas
        </h2>

        <div className="sticky top-0 z-30 -mx-4 bg-background px-4 md:-mx-8 md:px-8">
          <div className="flex items-center gap-3 py-3 md:gap-6">
            <SearchField
              defaultQuery={query}
              onQueryChange={setQuery}
              onEnterList={enterList}
              ref={searchRef}
              listId={LIST_ID}
              resultsLabel={announcement}
            />
            <div className="hidden shrink-0 text-right sm:block">
              <p className="label-mono text-muted-foreground">{counter}</p>
              <p className="label-mono mt-1 text-faint">
                Pág. {padIndex(params.page, 2)}/{padIndex(directory.lastPage, 2)}
              </p>
            </div>
            <Hint label="Recargar">
              <Button
                variant="outline"
                size="icon"
                onClick={() => void onRefresh()}
                disabled={directory.refreshing}
                aria-label="Recargar desde la página 1"
                data-cue="primary"
              >
                <RotateCw className={cn(directory.refreshing && "animate-spin")} aria-hidden="true" />
              </Button>
            </Hint>
          </div>
          <Progress value={loaded} max={Math.max(1, directory.total)} aria-label="Razas cargadas del total" />
        </div>

        {directory.source === "snapshot" && directory.snapshotSavedAt !== null && (
          <SnapshotBanner savedAt={directory.snapshotSavedAt} />
        )}

        {loaded === 0 &&
          (initialError ? (
            <InitialError error={initialError} onRetry={() => void retryInitial()} />
          ) : (
            <div role="status" aria-label="Cargando razas">
              {serverError && (
                <p className="label-mono flex items-center gap-2 py-3 text-accent-foreground">
                  <ServerCrash className="size-3.5" aria-hidden="true" />
                  El servidor no alcanzó la API · reintentando desde tu navegador
                </p>
              )}
              <RowSkeletons count={8} />
            </div>
          ))}

        {emptyFilter && (
          <EmptyResults
            query={query}
            loaded={loaded}
            hasNextPage={directory.hasNextPage}
            onClear={clearQuery}
            onLoadMore={directory.loadMore}
          />
        )}

        <BreedList
          id={LIST_ID}
          ref={listRef}
          entries={results}
          setSize={filterActive ? results.length : Math.max(directory.total, results.length)}
          query={query}
          busy={directory.isFetchingNextPage}
          canAutoLoad={!filterActive && directory.source === "live"}
          onReachEnd={directory.loadMore}
          onVisiblePageChange={setPage}
          restorePage={restorePage}
          lastVisitedSlug={lastVisitedSlug}
          onOpen={onOpen}
          onExitTop={onExitTop}
        />

        {loaded > 0 && !emptyFilter && (
          <ListFooter
            loaded={loaded}
            total={directory.total}
            nextPage={nextPage}
            lastPage={directory.lastPage}
            perPage={initialPages[0]?.perPage ?? 25}
            filterActive={filterActive}
            hasNextPage={directory.hasNextPage}
            isFetchingNextPage={directory.isFetchingNextPage}
            isPaused={directory.isPaused}
            nextPageError={nextPageError}
            source={directory.source}
            onLoadMore={directory.loadMore}
            onRetry={retryNextPage}
          />
        )}

        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
      </section>
    </PullToRefresh>
  );
}

function InitialError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const copy = describeError(error);
  return (
    <div role="alert" className="corner-marks my-8 flex flex-col items-start gap-4 px-6 py-10">
      <ServerCrash className="size-5 text-primary" aria-hidden="true" />
      <div>
        <p className="font-serif text-3xl">No pudimos abrir el directorio</p>
        <p className="mt-2 max-w-prose text-muted-foreground">
          {copy.title}. {copy.description} Lo intentamos varias veces antes de mostrarte esto.
        </p>
      </div>
      <Button onClick={onRetry} data-cue="primary">
        <RotateCw aria-hidden="true" /> Reintentar
      </Button>
    </div>
  );
}
