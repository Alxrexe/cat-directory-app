"use client";

import { useQuery } from "@tanstack/react-query";
import { CloudOff } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useUseCases } from "../providers/use-cases-provider";
import { useConnectionStore } from "../stores/connection-store";
import { describeError } from "../lib/error-copy";
import { useIdleModule, usePageSettled } from "../lib/idle";
import { motionArmed } from "../lib/motion";
import { notify } from "../lib/notify";
import { playCue } from "../lib/sound";

// Entrada palabra a palabra, en su propio chunk y solo después del primer gesto.
const loadFactText = () => import("../features/breed-detail/fact-text");

/** Con `gcTime: 0` cada visita a la ficha trae un dato nuevo. */
export function useRandomFact(slug: string) {
  const { getRandomFact } = useUseCases();
  // Después del load: en una ficha abierta por enlace no compite con la foto.
  const settled = usePageSettled();
  const query = useQuery({
    queryKey: ["random-fact", slug],
    queryFn: ({ signal }) => getRandomFact({ signal }),
    enabled: settled,
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

  return query;
}

export type RandomFactQuery = ReturnType<typeof useRandomFact>;

export function FactLcd({ fact }: { fact: RandomFactQuery }) {
  const retry = useConnectionStore((state) => state.retry);
  const paused = fact.fetchStatus === "paused";
  const loading = !paused && (fact.isFetching || fact.isPending);
  const text = fact.data?.text;
  // Se decide al llegar cada dato, para no re-animar uno que ya se ve.
  const animate = useMemo(() => Boolean(text) && motionArmed(), [text]);
  const factModule = useIdleModule(loadFactText, { now: animate, idle: false });
  const FactText = animate ? factModule?.default : undefined;

  return (
    <section
      aria-labelledby="fact-title"
      aria-busy={loading}
      // Toma la altura de la fila; un dato largo se desplaza por dentro.
      data-screen
      className="squircle rounded-[26px] screen-glass p-1.5 lg:flex lg:h-full lg:flex-col"
    >
      <div className="flex min-h-[6rem] flex-col rounded-[21px] px-5 py-3.5 ring-1 ring-white/5 lg:min-h-0 lg:flex-1 lg:py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h3 id="fact-title" className="hud text-screen-accent">
            Dato curioso
          </h3>
          <p className="hud text-[0.56rem] text-screen-soft">En inglés · catfact.ninja</p>
        </div>

        <div className="mt-1.5 flex min-h-0 flex-1 flex-col" role="status" aria-live="polite">
          {paused ? (
            <p className="flex items-start gap-2 text-sm text-screen-soft">
              <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Sin conexión. El dato llegará en cuanto vuelva la red.
            </p>
          ) : loading ? (
            <div>
              <span className="sr-only">
                {retry ? `Reintentando, intento ${retry.attempt} de ${retry.retries}` : "Buscando un dato curioso"}
              </span>
              <p aria-hidden="true" className="hud text-screen-accent">
                {retry ? `REINTENTANDO ${retry.attempt}/${retry.retries}` : "BUSCANDO"}
                <span className="ml-1 inline-block animate-blink">▌</span>
              </p>
              <div aria-hidden="true" className="mt-2 space-y-2">
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                </div>
                <div className="relative h-3 w-2/3 overflow-hidden rounded-full bg-white/[0.07]">
                  <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                </div>
              </div>
            </div>
          ) : fact.isError ? (
            <div role="alert">
              <p className="font-semibold text-screen-ink">No pudimos traer el dato.</p>
              <p className="mt-1 text-sm text-screen-soft">{describeError(fact.error).description} Pulsa A para reintentar.</p>
            </div>
          ) : fact.data ? (
            <blockquote
              lang="en"
              tabIndex={0}
              data-lenis-prevent
              className="min-h-0 flex-1 rounded-md text-[1.02rem] leading-relaxed text-screen-ink outline-none focus-visible:ring-2 focus-visible:ring-screen-accent/60 lg:overflow-y-auto lg:overscroll-contain lg:pb-3 lg:[mask-image:linear-gradient(to_bottom,black_calc(100%-0.9rem),transparent)] [scrollbar-color:var(--screen-soft)_transparent] [scrollbar-width:thin]"
            >
              {FactText ? <FactText key={fact.data.text} text={fact.data.text} /> : <span className="block">{fact.data.text}</span>}
            </blockquote>
          ) : null}
        </div>
      </div>
    </section>
  );
}
