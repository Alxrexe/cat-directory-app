"use client";

import { CloudOff, RotateCw, SearchX } from "lucide-react";
import { Button } from "../components/ui/button";
import { describeError } from "../lib/error-copy";
import { padIndex, timeAgo } from "../lib/format";

export function DockSkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="px-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex h-16 items-center gap-3 px-2">
          <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-slate/8">
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-surface to-transparent" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="relative h-3.5 w-40 overflow-hidden rounded-full bg-slate/8">
              <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-surface to-transparent" />
            </div>
            <div className="h-2.5 w-24 rounded-full bg-slate/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface DockFooterProps {
  loaded: number;
  total: number;
  nextPage: number;
  lastPage: number;
  perPage: number;
  filtering: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isPaused: boolean;
  nextPageError: unknown;
  source: "live" | "snapshot" | "empty";
  snapshotSavedAt: number | null;
  onLoadMore: () => void;
  onRetry: () => void;
}

/**
 * Lo que hay bajo la última fila. Siempre explica por qué la lista acaba
 * ahí: cargando, en pausa sin red, falló (tras reintentar), filtrando, o
 * de verdad no hay más.
 */
export function DockFooter(props: DockFooterProps) {
  const { loaded, total, nextPage, lastPage } = props;

  if (props.isPaused) {
    return (
      <Note icon={<CloudOff aria-hidden="true" />} title="En pausa: no hay conexión">
        La página {nextPage} se cargará sola cuando vuelva la red.
      </Note>
    );
  }

  if (props.isFetchingNextPage) {
    return (
      <div role="status" aria-live="polite">
        <DockSkeletonRows count={2} />
        <p className="hud px-4 py-3 text-ink-soft">
          Despertando página {padIndex(nextPage, 2)} de {padIndex(lastPage, 2)}…
        </p>
      </div>
    );
  }

  if (props.nextPageError) {
    const copy = describeError(props.nextPageError);
    return (
      <div role="alert" className="mx-2 my-2 flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-[1.5px] ring-ring sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-ink">
            No se pudo cargar la página {nextPage}. {copy.title}.
          </p>
          <p className="mt-1 text-sm text-ink-soft">{copy.description} Ya lo intentamos varias veces con esperas crecientes.</p>
        </div>
        <Button variant="default" size="sm" onClick={props.onRetry} data-cue="primary">
          <RotateCw aria-hidden="true" /> Reintentar
        </Button>
      </div>
    );
  }

  if (props.source === "snapshot") {
    return (
      <Note icon={<CloudOff aria-hidden="true" />} title="Estás viendo la copia guardada">
        {props.snapshotSavedAt ? `Guardada ${timeAgo(props.snapshotSavedAt)}. ` : ""}Al volver la red se cargará el resto.
      </Note>
    );
  }

  if (props.filtering && props.hasNextPage) {
    const remaining = Math.max(0, total - loaded);
    return (
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-soft">
          Buscas entre las {loaded} razas despiertas. Quedan {remaining} dormidas.
        </p>
        <Button variant="outline" size="sm" onClick={props.onLoadMore}>
          Despertar {Math.min(props.perPage, remaining)} más
        </Button>
      </div>
    );
  }

  if (!props.hasNextPage && loaded > 0) {
    return (
      <p className="hud flex items-center justify-center gap-3 py-5 text-ink-soft">
        <span className="h-px w-8 bg-ring" aria-hidden="true" />
        Fin del Michiverso · {padIndex(total)} razas
        <span className="h-px w-8 bg-ring" aria-hidden="true" />
      </p>
    );
  }

  return null;
}

function Note({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div role="status" className="mx-2 my-2 flex items-start gap-3 rounded-2xl bg-surface p-4 ring-[1.5px] ring-ring [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:text-accent">
      {icon}
      <div>
        <p className="font-display text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink-soft">{children}</p>
      </div>
    </div>
  );
}

export function DockEmpty({
  query,
  loaded,
  hasNextPage,
  onClear,
  onLoadMore,
}: {
  query: string;
  loaded: number;
  hasNextPage: boolean;
  onClear: () => void;
  onLoadMore: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
      <SearchX className="size-6 text-accent" aria-hidden="true" />
      <p className="font-display text-ink">
        {query ? `Ninguna de las ${loaded} razas despiertas se llama «${query}».` : "Ninguna raza despierta tiene ese pelaje."}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={onClear}>
          Limpiar filtros
        </Button>
        {hasNextPage && (
          <Button variant="default" size="sm" onClick={onLoadMore}>
            Despertar la página siguiente
          </Button>
        )}
      </div>
    </div>
  );
}
