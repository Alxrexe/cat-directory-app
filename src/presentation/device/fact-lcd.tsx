"use client";

import { useQuery } from "@tanstack/react-query";
import { CloudOff } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useUseCases } from "../providers/use-cases-provider";
import { useConnectionStore } from "../stores/connection-store";
import { describeError } from "../lib/error-copy";
import { readyGsap } from "../lib/gsap";
import { useIdleModule } from "../lib/idle";
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

  return query;
}

export type RandomFactQuery = ReturnType<typeof useRandomFact>;

export function FactLcd({ fact }: { fact: RandomFactQuery }) {
  const retry = useConnectionStore((state) => state.retry);
  const paused = fact.fetchStatus === "paused";
  const loading = fact.isFetching && !paused;
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
      className="rounded-[28px] bg-screen p-2 shadow-[inset_0_3px_14px_oklch(15%_0.04_275/0.55)]"
    >
      <div className="min-h-[7.5rem] rounded-[22px] p-4 ring-1 ring-white/5">
        <div className="flex items-center justify-between gap-3">
          <h3 id="fact-title" className="hud text-screen-accent">
            Dato curioso
          </h3>
          <span className="hud text-screen-soft" aria-hidden="true">
            A · otro dato
          </span>
        </div>

        <div className="mt-2" role="status" aria-live="polite">
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
            // En escritorio, tres líneas como mucho: un dato largo se desplaza
            // dentro del LCD y el Ronrón no cambia de tamaño.
            <blockquote
              lang="en"
              tabIndex={0}
              data-lenis-prevent
              className="rounded-md text-[1.02rem] leading-relaxed text-screen-ink outline-none focus-visible:ring-2 focus-visible:ring-screen-accent/60 lg:max-h-[5.1rem] lg:overflow-y-auto lg:overscroll-contain [scrollbar-color:oklch(82%_0.09_255/0.4)_transparent] [scrollbar-width:thin]"
            >
              {FactText ? <FactText key={fact.data.text} text={fact.data.text} /> : <span className="block">{fact.data.text}</span>}
            </blockquote>
          ) : null}
        </div>
        <p className="mt-2 text-[0.7rem] text-screen-soft">En inglés, tal como lo publica catfact.ninja.</p>
      </div>
    </section>
  );
}
