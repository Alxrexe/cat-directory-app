"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  memo,
  useCallback,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
  type RefObject,
} from "react";
import { coatFamily } from "@domain/breed/coat";
import { describeCountry } from "@domain/breed/country";
import { OrbShape } from "../brand/orb-shape";
import type { DirectoryEntry } from "../features/directory/use-breed-directory";
import { Highlight } from "../features/directory/highlight";
import { COAT_LABEL, MISSING, padIndex } from "../lib/format";
import { breedMonogram } from "../lib/monogram";

const ROW = 64;
/** Filas antes del final a las que ya se pide la página siguiente. */
const LOAD_AHEAD = 5;

export interface DockListHandle {
  focusRow: (index: number) => void;
}

interface DockListProps {
  id: string;
  entries: readonly DirectoryEntry[];
  setSize: number;
  query: string;
  busy: boolean;
  canAutoLoad: boolean;
  onReachEnd: () => void;
  onVisiblePageChange: (page: number) => void;
  restorePage: number;
  onOpen: (slug: string, rect: DOMRect) => void;
  onSpotlight: (slug: string | null) => void;
  onExitTop: () => void;
  footer?: React.ReactNode;
  /** Contenedor con scroll, compartido con el gesto de recarga. */
  scrollRef: RefObject<HTMLDivElement | null>;
  ref?: Ref<DockListHandle>;
}

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

/**
 * Lista de la consola, virtualizada sobre su propio contenedor: con 98 razas
 * o con 10 000, en el DOM hay las filas visibles más un margen.
 *
 * - Scroll infinito: al acercarse al final pide la página siguiente.
 * - Teclado: un tabulador entra (tabindex itinerante) y las flechas,
 *   Inicio/Fin y RePág/AvPág recorren las filas.
 * - `?page=` refleja la página de la fila que está arriba; al abrir un
 *   enlace con `?page=3` la lista se desplaza hasta esa página.
 */
export function DockList(props: DockListProps) {
  const { id, entries, setSize, query, busy, canAutoLoad, onReachEnd, onVisiblePageChange, restorePage, scrollRef, ref } = props;
  const listRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW,
    overscan: 6,
    initialRect: { width: 900, height: 320 },
    getItemKey: (index) => entries[index]?.breed.slug ?? index,
  });
  const items = virtualizer.getVirtualItems();

  // ── Foco itinerante ────────────────────────────────────────────────────
  const [activeIndex, setActiveIndex] = useState(0);
  const active = Math.min(activeIndex, Math.max(0, entries.length - 1));
  const pendingFocus = useRef<number | null>(null);

  const focusRow = useCallback(
    (index: number) => {
      if (entries.length === 0) return;
      const target = Math.min(Math.max(0, index), entries.length - 1);
      setActiveIndex(target);
      pendingFocus.current = target;
      virtualizer.scrollToIndex(target, { align: "auto" });
      requestAnimationFrame(() => focusPendingRow(listRef.current, pendingFocus));
    },
    [entries.length, virtualizer],
  );
  useImperativeHandle(ref, () => ({ focusRow }), [focusRow]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const row = (event.target as HTMLElement).closest<HTMLElement>("[data-row-index]");
    const current = row ? Number(row.dataset.rowIndex) : active;
    const pageSize = Math.max(1, Math.floor((scrollRef.current?.clientHeight ?? 320) / ROW) - 1);
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
      props.onExitTop();
      return;
    }
    focusRow(moves[event.key]);
  };

  // ── Restaurar `?page=` ─────────────────────────────────────────────────
  const restored = useRef(false);
  const restore = useEffectEvent(() => {
    restored.current = true;
    if (restorePage <= 1) return;
    const target = entries.findIndex((entry) => entry.page >= restorePage);
    if (target > 0) virtualizer.scrollToIndex(target, { align: "start" });
  });
  useEffect(() => {
    if (!restored.current && entries.length > 0) restore();
  }, [entries.length]);

  // ── Scroll infinito ────────────────────────────────────────────────────
  const lastVisible = virtualizer.range?.endIndex ?? -1;
  const measured = (virtualizer.scrollRect?.height ?? 0) > 0;
  useEffect(() => {
    if (!canAutoLoad || !measured || entries.length === 0) return;
    if (lastVisible >= entries.length - 1 - LOAD_AHEAD) onReachEnd();
  }, [canAutoLoad, measured, lastVisible, entries.length, onReachEnd]);

  // ── Página visible → URL ───────────────────────────────────────────────
  const topPage = entries[virtualizer.range?.startIndex ?? 0]?.page;
  useEffect(() => {
    if (!restored.current || !topPage) return;
    const timer = setTimeout(() => onVisiblePageChange(topPage), 150);
    return () => clearTimeout(timer);
  }, [topPage, onVisiblePageChange]);

  const onFocusRow = useCallback((index: number) => setActiveIndex(index), []);

  return (
    <div ref={scrollRef} data-lenis-prevent className="no-scrollbar h-full overflow-y-auto overscroll-contain px-2 pb-2">
      <p id={`${id}-hint`} className="sr-only">
        Usa las flechas arriba y abajo para moverte entre razas; Inicio y Fin para ir a los extremos.
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
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <DockRow
                entry={entry}
                index={item.index}
                active={item.index === active}
                query={query}
                onFocusRow={onFocusRow}
                onOpen={props.onOpen}
                onSpotlight={props.onSpotlight}
              />
            </div>
          );
        })}
      </div>
      {props.footer}
    </div>
  );
}

interface DockRowProps {
  entry: DirectoryEntry;
  index: number;
  active: boolean;
  query: string;
  onFocusRow: (index: number) => void;
  onOpen: (slug: string, rect: DOMRect) => void;
  onSpotlight: (slug: string | null) => void;
}

const DockRow = memo(function DockRow({ entry, index, active, query, onFocusRow, onOpen, onSpotlight }: DockRowProps) {
  const { breed } = entry;
  const country = describeCountry(breed.country);
  const family = coatFamily(breed.coat);

  return (
    <Link
      href={`/razas/${breed.slug}`}
      scroll={false}
      data-row-index={index}
      data-cue="breed"
      tabIndex={active ? 0 : -1}
      onFocus={() => {
        onFocusRow(index);
        onSpotlight(breed.slug);
      }}
      onBlur={() => onSpotlight(null)}
      onPointerEnter={() => onSpotlight(breed.slug)}
      onPointerLeave={() => onSpotlight(null)}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => onOpen(breed.slug, event.currentTarget.getBoundingClientRect())}
      className="group relative isolate flex h-16 items-center gap-3 rounded-2xl px-2 outline-offset-[-3px] before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:bg-[linear-gradient(180deg,var(--pearl-hi),var(--pearl-lo))] before:opacity-0 before:shadow-[0_0_0_1px_var(--hairline),inset_0_1px_0_var(--sheen),0_10px_22px_-14px_var(--shadow-deep)] before:transition-opacity before:duration-200 hover:before:opacity-100 focus-visible:before:opacity-100"
    >
      <span className="relative grid size-11 shrink-0 place-items-center">
        <OrbShape className="absolute inset-0 size-full" pearl innerEar="var(--pearl-hi)" />
        <span className="relative mt-1.5 font-display text-sm font-semibold text-slate">{breedMonogram(breed.name)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[1.02rem] leading-tight font-medium text-ink">
          <Highlight text={breed.name} query={query} />
        </span>
        <span className="block truncate text-[0.8rem] text-ink-soft">{country?.primary ?? MISSING}</span>
      </span>
      <span className="hud hidden shrink-0 text-[0.58rem] text-ink-soft sm:block">{COAT_LABEL[family]}</span>
      <span className="lcd w-9 shrink-0 text-right text-[0.8rem] text-ink-soft" aria-hidden="true">
        {padIndex(entry.position)}
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-slate transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
});
