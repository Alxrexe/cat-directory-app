"use client";

import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { ChevronUp, RotateCw } from "lucide-react";
import { Suspense, useCallback, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { CoatFamily } from "@domain/breed/coat";
import { Button } from "../components/ui/button";
import { Hint } from "../components/ui/hint";
import { SearchField, type SearchFieldHandle } from "../features/directory/search-field";
import { PullToRefresh } from "../features/directory/pull-to-refresh";
import type { BreedDirectory, DirectoryEntry } from "../features/directory/use-breed-directory";
import { cn } from "../lib/cn";
import type { CoatFilter } from "../lib/directory-params";
import { COAT_LABEL, padIndex } from "../lib/format";
import { DockList, type DockListHandle } from "./dock-list";
import { DockEmpty, DockFooter, DockSkeletonRows } from "./dock-status";

const LIST_ID = "breed-list";
const CHIPS: CoatFilter[] = ["all", "short", "semi-long", "long", "mixed", "rex", "hairless"];

export interface SearchDockHandle {
  collapse: () => void;
  focusSearch: () => void;
}

interface SearchDockProps {
  visible: boolean;
  directory: BreedDirectory;
  results: readonly DirectoryEntry[];
  query: string;
  coat: CoatFilter;
  restorePage: number;
  initialExpanded: boolean;
  announcement: string;
  onQueryChange: (query: string) => void;
  onCoatChange: (coat: CoatFilter) => void;
  onVisiblePageChange: (page: number) => void;
  onOpen: (slug: string, rect: DOMRect) => void;
  onSpotlight: (slug: string | null) => void;
  onRefresh: () => Promise<void>;
  ref?: Ref<SearchDockHandle>;
}

/**
 * La consola de abajo, como la barra inferior del menú de una consola de
 * sobremesa: una pieza de porcelana cuyo borde se levanta en el centro
 * (la "joroba") para alojar el buscador, con botones redondos en las
 * esquinas (recargar, lista), los filtros de pelaje como un selector de
 * canales y una tira de atajos reales en mono.
 *
 * Plegada, solo asoma la barra; desplegada, la bandeja sube con la lista.
 * El movimiento es un `translateY` del bloque entero (nunca se anima la
 * altura), así que corre en el compositor.
 */
export function SearchDock({
  visible,
  directory,
  results,
  query,
  coat,
  restorePage,
  initialExpanded,
  announcement,
  onQueryChange,
  onCoatChange,
  onVisiblePageChange,
  onOpen,
  onSpotlight,
  onRefresh,
  ref,
}: SearchDockProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<SearchFieldHandle>(null);
  const listRef = useRef<DockListHandle>(null);
  const [expanded, setExpanded] = useState(initialExpanded);

  const filtering = query.length > 0 || coat !== "all";
  const loaded = directory.entries.length;
  const emptyFilter = filtering && loaded > 0 && results.length === 0;

  const collapse = useCallback(() => setExpanded(false), []);
  const focusSearch = useCallback(() => {
    setExpanded(true);
    searchRef.current?.focus();
  }, []);
  // Para el campo (plegar al tocar el cielo) y el atajo "/".
  useImperativeHandle(ref, () => ({ collapse, focusSearch }), [collapse, focusSearch]);

  const enterList = useCallback(() => {
    setExpanded(true);
    listRef.current?.focusRow(0);
  }, []);

  const clearFilters = useCallback(() => {
    searchRef.current?.clear();
    onCoatChange("all");
  }, [onCoatChange]);

  const counter = filtering ? `${results.length}/${loaded}` : `${padIndex(loaded)}/${padIndex(directory.total)}`;

  return (
    <section
      aria-labelledby="dock-title"
      inert={!visible}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30"
    >
      <div
        data-state={!visible ? "hidden" : expanded ? "open" : "closed"}
        className={cn(
          "pointer-events-auto relative w-full text-ink [--highlight:var(--accent)] [--panel:min(380px,46dvh)]",
          "drop-shadow-[0_-10px_22px_oklch(29%_0.045_275/0.16)]",
          // Solo transform: la bandeja se desliza, nunca cambia de altura.
          "transition-transform duration-700 ease-[var(--ease-cozy)] will-change-transform",
          "data-[state=closed]:[transform:translateY(var(--panel))] data-[state=hidden]:[transform:translateY(calc(var(--panel)+220px))]",
        )}
      >
        <h2 id="dock-title" className="sr-only">
          Consola de búsqueda
        </h2>

        {/*
          Silueta: cinco columnas. Los extremos son la barra plana (su filete
          superior es el borde); las dos intermedias son los hombros curvos
          en SVG; la central es la joroba que sube y aloja el buscador.
        */}
        <div className="grid grid-cols-[52px_26px_minmax(0,1fr)_26px_52px] grid-rows-[22px_auto] sm:grid-cols-[minmax(72px,1fr)_56px_minmax(0,660px)_56px_minmax(72px,1fr)] sm:grid-rows-[28px_auto]">
          <div aria-hidden="true" className="col-start-1 row-start-1 border-b-2 border-ring" />
          <Shoulder className="col-start-2 row-start-1" />
          <div className="col-start-3 row-span-2 row-start-1 border-t-2 border-ring bg-surface px-1 pt-3 sm:px-2 sm:pt-4">
            <SearchField
              ref={searchRef}
              defaultQuery={query}
              onQueryChange={(value) => {
                onQueryChange(value);
                if (value) setExpanded(true);
              }}
              onEnterList={enterList}
              onFocus={() => setExpanded(true)}
              onEscapeEmpty={collapse}
              listId={LIST_ID}
              resultsLabel={announcement}
            />
          </div>
          <Shoulder mirrored className="col-start-4 row-start-1" />
          <div aria-hidden="true" className="col-start-5 row-start-1 border-b-2 border-ring" />

          {/* Esquina izquierda: recargar y el contador. */}
          <div className="col-span-2 col-start-1 row-start-2 flex items-center gap-3 bg-surface pt-2 pl-2 sm:pl-5">
            <Hint label="Recargar desde la página 1">
              <Button
                variant="console"
                size="icon-lg"
                onClick={() => void onRefresh()}
                disabled={directory.refreshing}
                aria-label="Recargar desde la página 1"
                data-cue="primary"
                className="max-sm:size-11"
              >
                <RotateCw className={cn("size-5", directory.refreshing && "animate-spin")} aria-hidden="true" />
              </Button>
            </Hint>
            <span className="hidden flex-col gap-1 leading-none lg:flex">
              <span className="tabular text-[1.05rem] font-medium text-ink">{counter}</span>
              <span className="hud text-[0.58rem] text-ink-soft">{filtering ? "Coinciden" : "Despiertas"}</span>
            </span>
          </div>

          {/* Esquina derecha: la lista. */}
          <div className="col-span-2 col-start-4 row-start-2 flex items-center justify-end gap-3 bg-surface pt-2 pr-2 sm:pr-5">
            <span className="hud hidden text-[0.58rem] text-ink-soft lg:block" aria-hidden="true">
              {expanded ? "Plegar" : "Lista"}
            </span>
            <Button
              variant={expanded ? "default" : "console"}
              size="icon-lg"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              aria-controls="dock-panel"
              aria-label={expanded ? "Plegar la lista" : "Desplegar la lista"}
              className="max-sm:size-11"
            >
              <ChevronUp
                className={cn(
                  "size-5 transition-transform duration-500 ease-[var(--ease-cozy)]",
                  expanded && "rotate-180",
                )}
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>

        {/* Selector de canales (pelaje) y, en escritorio, la tira de atajos. */}
        <div className="bg-surface px-3 pt-3 pb-3 sm:px-5">
          <div className="mx-auto flex max-w-[780px] items-center gap-3">
            <ToggleGroup.Root
              type="single"
              value={coat}
              onValueChange={(value) => onCoatChange((value || "all") as CoatFilter)}
              aria-label="Filtrar por pelaje"
              className="no-scrollbar -my-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-0.5 py-1 sm:justify-center"
            >
              {CHIPS.map((chip) => (
                <ToggleGroup.Item
                  key={chip}
                  value={chip}
                  className="relative isolate h-9 shrink-0 rounded-full px-4 font-display text-[0.82rem] font-medium text-ink-soft ring-[1.5px] ring-ring before:absolute before:inset-0 before:-z-10 before:scale-90 before:rounded-full before:bg-slate before:opacity-0 before:transition-[opacity,transform] before:duration-300 before:ease-[var(--ease-cozy)] hover:text-ink data-[state=on]:text-surface data-[state=on]:ring-slate data-[state=on]:before:scale-100 data-[state=on]:before:opacity-100"
                >
                  {chip === "all" ? "Todos" : COAT_LABEL[chip as CoatFamily]}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>
            <span className="tabular shrink-0 text-sm text-ink-soft lg:hidden">{counter}</span>
          </div>
          <ShortcutStrip />
        </div>

        {/* Bandeja con la lista */}
        <div
          id="dock-panel"
          className="relative h-[var(--panel)] border-t-[1.5px] border-ring bg-paper"
          inert={!expanded}
        >
          <div className="relative mx-auto h-full max-w-[980px]">
            <PullToRefresh
              enabled={expanded}
              onRefresh={onRefresh}
              refreshing={directory.refreshing}
              target={scrollRef}
              isAtTop={() => (scrollRef.current?.scrollTop ?? 0) <= 0}
            />
            {loaded === 0 ? (
              <div role="status" aria-label="Cargando razas" className="pt-2">
                <DockSkeletonRows count={5} />
              </div>
            ) : emptyFilter ? (
              <DockEmpty
                query={query}
                loaded={loaded}
                hasNextPage={directory.hasNextPage}
                onClear={clearFilters}
                onLoadMore={directory.loadMore}
              />
            ) : (
              // Hidratación aparte para la lista (la parte más pesada de la consola).
              <Suspense fallback={null}>
                <DockList
                  id={LIST_ID}
                  ref={listRef}
                  scrollRef={scrollRef}
                  entries={results}
                  setSize={filtering ? results.length : Math.max(directory.total, results.length)}
                  query={query}
                  busy={directory.isFetchingNextPage}
                  canAutoLoad={!filtering && directory.source === "live" && expanded}
                  onReachEnd={directory.loadMore}
                  onVisiblePageChange={onVisiblePageChange}
                  restorePage={restorePage}
                  onOpen={onOpen}
                  onSpotlight={onSpotlight}
                  onExitTop={() => searchRef.current?.focus()}
                  footer={
                    <DockFooter
                      loaded={loaded}
                      total={directory.total}
                      nextPage={directory.loadedPages + 1}
                      lastPage={directory.lastPage}
                      perPage={25}
                      filtering={filtering}
                      hasNextPage={directory.hasNextPage}
                      isFetchingNextPage={directory.isFetchingNextPage}
                      isPaused={directory.isPaused}
                      nextPageError={directory.nextPageError}
                      source={directory.source}
                      snapshotSavedAt={directory.snapshotSavedAt}
                      onLoadMore={directory.loadMore}
                      onRetry={directory.retryNextPage}
                    />
                  }
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Hombro de la joroba: una curva suave del filete de la barra a la cima. */
function Shoulder({ mirrored = false, className }: { mirrored?: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 56 28"
      preserveAspectRatio="none"
      className={cn("h-full w-full", mirrored && "-scale-x-100", className)}
    >
      <path d="M0 28 C28 28 28 0 56 0 L56 28 Z" fill="var(--surface)" />
      <path
        d="M0 27 C28 27 28 1 56 1"
        fill="none"
        stroke="var(--ring)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Atajos reales de la consola, como la tira de botones de un menú de
 * consola. Solo con teclado físico a la vista (escritorio).
 */
function ShortcutStrip() {
  const keys: Array<[string, string]> = [
    ["/", "Buscar"],
    ["↓", "Recorrer la lista"],
    ["Esc", "Limpiar o plegar"],
    ["⌘K", "Ir a una raza"],
  ];
  return (
    <div
      className="mx-auto mt-3 hidden max-w-[980px] items-center justify-between border-t border-ring pt-2.5 lg:flex"
      aria-hidden="true"
    >
      <ul className="flex items-center gap-5">
        {keys.map(([key, label]) => (
          <li key={key} className="hud flex items-center gap-2 text-[0.58rem] text-ink-soft">
            <kbd className="tabular grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.62rem] tracking-normal text-slate normal-case ring-[1.5px] ring-ring-strong">
              {key}
            </kbd>
            {label}
          </li>
        ))}
      </ul>
      <span className="hud text-[0.58rem] text-ink-soft">Rueda o arrastre · explorar el campo</span>
    </div>
  );
}
