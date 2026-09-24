"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
  type RefObject,
} from "react";
import { BreedRow } from "./breed-row";
import type { DirectoryEntry } from "./use-breed-directory";

const ROW_ESTIMATE = 77;
/** Filas antes del final a las que ya se pide la página siguiente. */
const LOAD_AHEAD = 6;
/** Alto de la barra de búsqueda fija: las filas enfocadas no quedan debajo. */
const STICKY_OFFSET = 88;

/**
 * Enfoca la fila pendiente en cuanto la virtualización la monta. Tras un
 * `scrollToIndex` la fila puede tardar uno o dos frames en existir.
 */
function focusPendingRow(list: HTMLElement | null, pending: RefObject<number | null>, attempt = 0): void {
  const target = pending.current;
  if (target === null || !list) return;
  const row = list.querySelector<HTMLElement>(`[data-row-index="${target}"]`);
  if (row) {
    row.focus({ preventScroll: true });
    pending.current = null;
  } else if (attempt < 20) {
    requestAnimationFrame(() => focusPendingRow(list, pending, attempt + 1));
  }
}

export interface BreedListHandle {
  focusRow: (index: number) => void;
}

interface BreedListProps {
  id: string;
  entries: readonly DirectoryEntry[];
  /** `aria-setsize`: total conocido de la colección que se está recorriendo. */
  setSize: number;
  query: string;
  busy: boolean;
  /** Se puede pedir la página siguiente sin intervención del usuario. */
  canAutoLoad: boolean;
  onReachEnd: () => void;
  /** Página de la API que ocupa el borde superior de la pantalla. */
  onVisiblePageChange: (page: number) => void;
  /** `?page=` con el que se abrió la vista: se desplaza hasta allí al montar. */
  restorePage: number;
  lastVisitedSlug: string | null;
  onOpen: (slug: string) => void;
  onExitTop: () => void;
  ref?: Ref<BreedListHandle>;
}

/**
 * Lista virtualizada sobre el scroll de la ventana.
 *
 * Solo existen en el DOM las filas visibles más un margen (overscan): con
 * diez mil razas el documento sigue teniendo unas veinte. `initialRect` hace
 * que el servidor también pinte las primeras filas, así el HTML inicial ya
 * trae contenido y no una caja vacía que se llena al hidratar.
 *
 * Teclado: un solo tabulador entra en la lista (tabindex itinerante) y las
 * flechas, Inicio/Fin y RePág/AvPág mueven el foco fila a fila, trayendo al
 * DOM las que la virtualización aún no había montado.
 */
export function BreedList({
  id,
  entries,
  setSize,
  query,
  busy,
  canAutoLoad,
  onReachEnd,
  onVisiblePageChange,
  restorePage,
  lastVisitedSlug,
  onOpen,
  onExitTop,
  ref,
}: BreedListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const node = listRef.current;
    if (!node) return;
    const measure = () => setScrollMargin(Math.round(node.getBoundingClientRect().top + window.scrollY));
    measure();
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure); // las fuentes cambian el alto del hero
    return () => window.removeEventListener("resize", measure);
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: entries.length,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 6,
    scrollMargin,
    scrollPaddingStart: STICKY_OFFSET,
    initialRect: { width: 1280, height: 900 },
    getItemKey: (index) => entries[index]?.breed.slug ?? index,
  });
  const items = virtualizer.getVirtualItems();

  // ── Foco itinerante ────────────────────────────────────────────────────
  const [activeIndex, setActiveIndex] = useState(0);
  const active = Math.min(activeIndex, Math.max(0, entries.length - 1));
  const pendingFocus = useRef<number | null>(null);

  const flushFocus = useCallback(
    () => requestAnimationFrame(() => focusPendingRow(listRef.current, pendingFocus)),
    [],
  );

  const focusRow = useCallback(
    (index: number) => {
      if (entries.length === 0) return;
      const target = Math.min(Math.max(0, index), entries.length - 1);
      setActiveIndex(target);
      pendingFocus.current = target;
      virtualizer.scrollToIndex(target, { align: "auto" });
      flushFocus();
    },
    [entries.length, virtualizer, flushFocus],
  );

  useImperativeHandle(ref, () => ({ focusRow }), [focusRow]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const row = (event.target as HTMLElement).closest<HTMLElement>("[data-row-index]");
    const current = row ? Number(row.dataset.rowIndex) : active;
    const pageSize = Math.max(1, Math.floor((window.innerHeight - STICKY_OFFSET) / ROW_ESTIMATE) - 1);

    const moves: Record<string, number> = {
      ArrowDown: current + 1,
      ArrowUp: current - 1,
      PageDown: current + pageSize,
      PageUp: current - pageSize,
      Home: 0,
      End: entries.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    if (event.key === "ArrowUp" && current === 0) {
      onExitTop();
      return;
    }
    focusRow(moves[event.key]);
  };

  const onFocusRow = useCallback((index: number) => setActiveIndex(index), []);

  // ── Restaurar `?page=` y el foco al volver del detalle ─────────────────
  const restored = useRef(false);
  const restore = useEffectEvent(() => {
    restored.current = true;
    const visitedIndex = lastVisitedSlug ? entries.findIndex((entry) => entry.breed.slug === lastVisitedSlug) : -1;
    if (visitedIndex >= 0) {
      setActiveIndex(visitedIndex);
      pendingFocus.current = visitedIndex;
      // "auto": si la fila ya está a la vista (atrás del navegador), no se mueve nada.
      virtualizer.scrollToIndex(visitedIndex, { align: "auto" });
      flushFocus();
      return;
    }
    // El navegador ya restauró el scroll (atrás/adelante): no se pisa.
    if (restorePage <= 1 || window.scrollY > 8) return;
    const target = entries.findIndex((entry) => entry.page >= restorePage);
    if (target > 0) virtualizer.scrollToIndex(target, { align: "start" });
  });
  useEffect(() => {
    if (!restored.current && scrollMargin > 0 && entries.length > 0) restore();
  }, [scrollMargin, entries.length]);

  // ── Infinite scroll ────────────────────────────────────────────────────
  // Se mira la última fila *visible* (no la del overscan) y solo después de
  // medir dónde empieza la lista: antes, el rectángulo inicial supone que la
  // lista ocupa toda la pantalla y pediría la página 2 nada más cargar.
  const lastVisible = virtualizer.range?.endIndex ?? -1;
  useEffect(() => {
    if (!canAutoLoad || scrollMargin === 0 || entries.length === 0) return;
    if (lastVisible >= entries.length - 1 - LOAD_AHEAD) onReachEnd();
  }, [canAutoLoad, scrollMargin, lastVisible, entries.length, onReachEnd]);

  // ── Página visible → URL ───────────────────────────────────────────────
  const topPage = entries[virtualizer.range?.startIndex ?? 0]?.page;
  useEffect(() => {
    if (!restored.current || !topPage) return;
    const timer = setTimeout(() => onVisiblePageChange(topPage), 150);
    return () => clearTimeout(timer);
  }, [topPage, onVisiblePageChange]);

  return (
    <>
      <p id={`${id}-hint`} className="sr-only">
        Usa las flechas arriba y abajo para moverte entre razas, Inicio y Fin para saltar a los extremos.
      </p>
      <div
        ref={listRef}
        id={id}
        role="list"
        aria-label="Razas de gato"
        aria-busy={busy}
        aria-describedby={`${id}-hint`}
        onKeyDown={onKeyDown}
        className="relative"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {items.map((item) => {
          const entry = entries[item.index];
          if (!entry) return null;
          return (
            <div
              key={item.key}
              role="listitem"
              aria-setsize={setSize}
              aria-posinset={item.index + 1}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)` }}
            >
              <BreedRow
                entry={entry}
                index={item.index}
                active={item.index === active}
                query={query}
                onFocusRow={onFocusRow}
                onOpen={onOpen}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
