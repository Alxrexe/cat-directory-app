"use client";

import { useQuery } from "@tanstack/react-query";
import { CloudOff } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useUseCases } from "../providers/use-cases-provider";
import { useConnectionStore } from "../stores/connection-store";
import { describeError } from "../lib/error-copy";
import { readyGsap } from "../lib/gsap";
import { useIdleModule, usePageSettled } from "../lib/idle";
import { notify } from "../lib/notify";
import { playCue } from "../lib/sound";

// SplitType anima el texto palabra a palabra con GSAP; va en un chunk
// aparte. Solo se usa si GSAP ya llegó (el visitante interactuó) en el
// momento en que llega el dato: en una ficha recién abierta el dato aparece
// como texto plano y la carga no paga GSAP + SplitType.
const loadFactText = () => import("../features/breed-detail/fact-text");

/**
 * Dato curioso aleatorio con su propio ciclo de carga, independiente de la
 * ficha (que es estática y llega al instante). `gcTime: 0`: al cerrar el
 * Ronrón se descarta, y la próxima visita trae otro dato.
 */
export function useRandomFact(slug: string) {
  const { getRandomFact } = useUseCases();
  // En una ficha abierta desde un enlace, el dato (y el cliente HTTP que lo
  // trae) espera a que la página termine de cargar: no compite con la foto.
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
  // "Cargando" también mientras la consulta espera a que la página se asiente.
  const loading = !paused && (fact.isFetching || fact.isPending);
  const text = fact.data?.text;
  // Se decide al llegar cada dato: si GSAP aparece después, este dato no se
  // re-anima (se vería el texto desaparecer y volver).
  const animate = useMemo(() => Boolean(text) && readyGsap() !== null, [text]);
  const factModule = useIdleModule(loadFactText, { now: animate, idle: false });
  const FactText = animate ? factModule?.default : undefined;

  return (
    <section
      aria-labelledby="fact-title"
      aria-busy={loading}
      // En escritorio la tira ocupa la altura que le da la cruceta (h-full) y
      // el texto largo se desplaza por dentro: el Ronrón no cambia de tamaño.
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
            // Un dato largo se desplaza dentro de la tira, con el último
            // renglón fundido para que se note que sigue.
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
