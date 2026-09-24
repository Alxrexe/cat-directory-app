"use client";

import { useQuery } from "@tanstack/react-query";
import { CloudOff, RotateCw, Shuffle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { useUseCases } from "../../providers/use-cases-provider";
import { useConnectionStore } from "../../stores/connection-store";
import { describeError } from "../../lib/error-copy";
import { playCue } from "../../lib/sound";
import { cn } from "../../lib/cn";
import { useIdleModule } from "../../lib/idle";
import { notify } from "../../lib/notify";

// GSAP + SplitType solo para animar el texto: van en un chunk aparte que se
// pide cuando llega el primer dato. Mientras tanto (o si no se puede
// descargar), el dato se lee igual en texto plano.
const loadFactText = () => import("./fact-text");

/**
 * Dato curioso aleatorio con su propio ciclo de carga, independiente de la
 * ficha: la ficha es estática (SSG) y se pinta al instante; el dato se pide
 * desde el navegador en cada visita, así que nunca es el mismo congelado en
 * el HTML. `gcTime: 0` lo descarta al salir, para que la próxima visita
 * traiga otro.
 */
export function RandomFact({ slug }: { slug: string }) {
  const { getRandomFact } = useUseCases();
  const retry = useConnectionStore((state) => state.retry);

  const query = useQuery({
    queryKey: ["random-fact", slug],
    queryFn: ({ signal }) => getRandomFact({ signal }),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
  });

  const { error, refetch } = query;
  useEffect(() => {
    if (!error) return;
    const copy = describeError(error);
    playCue("error");
    notify.error(`Dato curioso: ${copy.title}`, {
      description: copy.description,
      action: { label: "Reintentar", onClick: () => void refetch() },
    });
  }, [error, refetch]);

  const factText = useIdleModule(loadFactText, { now: Boolean(query.data), idle: false });
  const FactText = factText?.default;

  const loading = query.isFetching && query.fetchStatus !== "paused";
  const paused = query.fetchStatus === "paused";

  return (
    <section
      aria-labelledby="fact-heading"
      aria-busy={loading}
      className="corner-marks relative flex min-h-[18rem] flex-col p-6 text-foreground md:p-8"
    >
      <h2 id="fact-heading" className="label-mono flex items-center gap-2 font-mono text-primary">
        <span className="h-px w-6 bg-primary" aria-hidden="true" />
        Dato curioso aleatorio
      </h2>

      <div className="mt-6 flex-1" role="status" aria-live="polite">
        {paused ? (
          <p className="flex items-start gap-2 text-muted-foreground">
            <CloudOff className="mt-1 size-4 shrink-0" aria-hidden="true" />
            Sin conexión. El dato llegará en cuanto vuelva la red.
          </p>
        ) : loading ? (
          <div>
            <span className="sr-only">
              {retry ? `Reintentando, intento ${retry.attempt} de ${retry.retries}` : "Buscando un dato curioso…"}
            </span>
            <Skeleton className="h-6 w-full" />
            <Skeleton className="mt-3 h-6 w-[92%]" />
            <Skeleton className="mt-3 h-6 w-[64%]" />
            {retry && (
              <p className="label-mono mt-5 text-accent-foreground" aria-hidden="true">
                Reintentando {retry.attempt}/{retry.retries} · espera creciente
              </p>
            )}
          </div>
        ) : query.isError ? (
          <div role="alert">
            <p className="font-medium">No pudimos traer el dato.</p>
            <p className="mt-1 text-sm text-muted-foreground">{describeError(query.error).description}</p>
          </div>
        ) : query.data ? (
          <blockquote lang="en" className="font-serif text-[1.5rem] leading-snug md:text-[1.75rem]">
            {FactText ? (
              <FactText key={query.data.text} text={query.data.text} />
            ) : (
              <span className="block">{query.data.text}</span>
            )}
          </blockquote>
        ) : null}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <p className="text-xs text-faint">En inglés, tal como lo publica la API.</p>
        <Button
          variant={query.isError ? "default" : "outline"}
          size="sm"
          onClick={() => {
            playCue("sparkle");
            void refetch();
          }}
          disabled={loading}
          data-cue="mute"
        >
          {query.isError ? <RotateCw aria-hidden="true" /> : <Shuffle aria-hidden="true" className={cn(loading && "opacity-40")} />}
          {query.isError ? "Reintentar" : "Otro dato"}
        </Button>
      </div>
    </section>
  );
}
