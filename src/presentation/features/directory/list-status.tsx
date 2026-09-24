"use client";

import { CloudOff, RotateCw, SearchX } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { describeError } from "../../lib/error-copy";
import { padIndex, timeAgo } from "../../lib/format";

export function RowSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="grid min-h-[76px] grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-x-3 border-b border-border md:grid-cols-[3.5rem_minmax(0,1.25fr)_minmax(0,1fr)] md:gap-x-6"
        >
          <Skeleton className="h-3 w-7" />
          <Skeleton className="h-7 w-[min(18rem,70%)]" />
          <Skeleton className="hidden h-4 w-32 md:block" />
        </div>
      ))}
    </div>
  );
}

interface ListFooterProps {
  loaded: number;
  total: number;
  nextPage: number;
  lastPage: number;
  filterActive: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isPaused: boolean;
  nextPageError: unknown;
  source: "live" | "snapshot" | "empty";
  perPage: number;
  onLoadMore: () => void;
  onRetry: () => void;
}

/**
 * Lo que hay debajo de la última fila. Siempre dice por qué la lista
 * termina ahí: se está cargando, falló, está en pausa por falta de red,
 * estás filtrando o, de verdad, no hay más.
 */
export function ListFooter(props: ListFooterProps) {
  const { loaded, total, nextPage, lastPage, filterActive, hasNextPage } = props;

  if (props.isFetchingNextPage && !props.isPaused) {
    return (
      <div role="status" aria-live="polite">
        <RowSkeletons count={3} />
        <p className="label-mono py-4 text-muted-foreground">
          Cargando página {padIndex(nextPage, 2)} de {padIndex(lastPage, 2)}…
        </p>
      </div>
    );
  }

  if (props.isPaused) {
    return (
      <FooterNote icon={<CloudOff aria-hidden="true" />} title="En pausa: no hay conexión">
        La página {nextPage} se cargará sola cuando vuelva la red.
      </FooterNote>
    );
  }

  if (props.nextPageError) {
    const copy = describeError(props.nextPageError);
    return (
      <div role="alert" className="flex flex-col gap-4 border-b border-border py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">
            No se pudo cargar la página {nextPage}. {copy.title}.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.description} Ya lo intentamos varias veces con esperas crecientes.
          </p>
        </div>
        <Button variant="outline" onClick={props.onRetry} data-cue="primary">
          <RotateCw aria-hidden="true" /> Reintentar
        </Button>
      </div>
    );
  }

  if (props.source === "snapshot") {
    return (
      <FooterNote icon={<CloudOff aria-hidden="true" />} title="Estás viendo la copia guardada">
        Solo la primera página se guarda en este dispositivo. Al volver la red se cargará el resto.
      </FooterNote>
    );
  }

  if (filterActive && hasNextPage) {
    const remaining = Math.max(0, total - loaded);
    return (
      <div className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          La búsqueda filtra las {loaded} razas cargadas. Quedan {remaining} por cargar.
        </p>
        <Button variant="outline" size="sm" onClick={props.onLoadMore}>
          Cargar {Math.min(props.perPage, remaining)} más
        </Button>
      </div>
    );
  }

  if (!hasNextPage && loaded > 0) {
    return (
      <p className="label-mono flex items-center gap-3 py-8 text-muted-foreground">
        <span className="h-px w-8 bg-border" aria-hidden="true" />
        Fin del directorio · {padIndex(total)} razas
      </p>
    );
  }

  return null;
}

function FooterNote({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-3 border-b border-border py-6 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:text-primary">
      {icon}
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

export function EmptyResults({
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
    <div className="corner-marks my-6 flex flex-col items-start gap-4 px-6 py-10 text-muted-foreground">
      <SearchX className="size-5 text-primary" aria-hidden="true" />
      <p className="text-foreground">
        Ninguna de las {loaded} razas cargadas se llama como «{query}».
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onClear}>
          Limpiar búsqueda
        </Button>
        {hasNextPage && (
          <Button variant="ghost" size="sm" onClick={onLoadMore}>
            Buscar también en la página siguiente
          </Button>
        )}
      </div>
    </div>
  );
}

export function SnapshotBanner({ savedAt }: { savedAt: number }) {
  return (
    <p role="status" className="label-mono flex items-center gap-2 border-b border-border py-3 text-accent-foreground">
      <CloudOff className="size-3.5" aria-hidden="true" />
      Copia guardada {timeAgo(savedAt)} · sin conexión con la API
    </p>
  );
}
