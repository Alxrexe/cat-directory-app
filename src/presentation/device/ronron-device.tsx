"use client";

import { Suspense, useCallback, useEffect, useEffectEvent, useRef, useState, type Ref } from "react";
import type { BreedDossier } from "@application/use-cases/get-breed-dossier";
import { readyGsap } from "../lib/gsap";
import { notify } from "../lib/notify";
import { playCue } from "../lib/sound";
import { useDiscoveryStore } from "../stores/discovery-store";
import { DPad, PillButton, PowerLed, RoundButton, ShoulderButton, Speaker } from "./controls";
import { DeviceScreen, SCREEN_TABS, type ScreenTab } from "./device-screen";
import { DeviceVisor } from "./device-visor";
import { FactLcd, useRandomFact } from "./fact-lcd";

export interface RonronDeviceProps {
  dossier: BreedDossier;
  /** Slugs del catálogo, para "Al azar". */
  catalog: readonly string[];
  mode: "modal" | "page";
  onClose: () => void;
  onNavigate: (slug: string, direction: -1 | 1) => void;
  rootRef?: Ref<HTMLElement>;
}

/**
 * El Ronrón: el dispositivo de bolsillo del Michiverso.
 *
 * Carcasa con orejas, visor con la foto recortada en forma de orbe-gato,
 * pantalla LCD con pestañas, franja de dato curioso y controles físicos
 * que funcionan de verdad:
 *   ◀ ▶ (cruceta o flechas)   raza anterior / siguiente
 *   ▲ ▼  L R                  pestaña anterior / siguiente
 *   A                         otro dato curioso
 *   B / Esc                   cerrar (o volver al Michiverso)
 */
export function RonronDevice({ dossier, catalog, mode, onClose, onNavigate, rootRef }: RonronDeviceProps) {
  const { breed, previous, next, profile } = dossier;
  const [tab, setTab] = useState<ScreenTab>("ficha");
  const [isNew, setIsNew] = useState(false);
  const earsRef = useRef<HTMLDivElement>(null);
  const fact = useRandomFact(breed.slug);

  // Colección: marcar como descubierta (después de leer lo guardado).
  useEffect(() => {
    let alive = true;
    void Promise.resolve(useDiscoveryStore.persist.rehydrate()).then(() => {
      if (!alive) return;
      const fresh = useDiscoveryStore.getState().discover(breed.slug);
      setIsNew(fresh);
      if (fresh) playCue("sparkle");
    });
    return () => {
      alive = false;
    };
  }, [breed.slug]);

  // Las orejas se mueven un poco cada vez que cambia la raza.
  useEffect(() => {
    const ears = earsRef.current?.children;
    const gsap = readyGsap();
    if (!gsap || !ears || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tl = gsap.timeline({ delay: 0.35 });
    tl.to(ears[0], { rotate: 38, duration: 0.14, ease: "power2.out" })
      .to(ears[0], { rotate: 45, duration: 0.5, ease: "elastic.out(1, 0.4)" })
      .to(ears[1], { rotate: 52, duration: 0.14, ease: "power2.out" }, 0.08)
      .to(ears[1], { rotate: 45, duration: 0.5, ease: "elastic.out(1, 0.4)" });
    return () => {
      tl.kill();
    };
  }, [breed.slug]);

  const moveTab = useCallback((step: -1 | 1) => {
    setTab((current) => SCREEN_TABS[(SCREEN_TABS.indexOf(current) + step + SCREEN_TABS.length) % SCREEN_TABS.length]);
    playCue("tick");
  }, []);

  const goPrevious = useCallback(() => previous && onNavigate(previous.slug, -1), [previous, onNavigate]);
  const goNext = useCallback(() => next && onNavigate(next.slug, 1), [next, onNavigate]);
  const random = useCallback(() => {
    const pool = catalog.filter((slug) => slug !== breed.slug);
    if (pool.length) onNavigate(pool[Math.floor(Math.random() * pool.length)], 1);
  }, [catalog, breed.slug, onNavigate]);

  const anotherFact = useCallback(() => {
    playCue("sparkle");
    void fact.refetch();
  }, [fact]);

  const share = useCallback(async () => {
    const url = `${window.location.origin}/razas/${breed.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: `${breed.name} · Michiverso`, url });
      else {
        await navigator.clipboard.writeText(url);
        notify.success("Enlace copiado", {
          description: `La ficha de ${breed.name} está en tu portapapeles.`,
        });
      }
    } catch {
      // Compartir cancelado: nada que avisar.
    }
  }, [breed.slug, breed.name]);

  // Atajos de teclado mientras el Ronrón está en pantalla.
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, [contenteditable='true']")) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const inTabs = Boolean(target?.closest("[role='tablist']"));
    switch (event.key) {
      case "ArrowLeft":
        if (!inTabs) goPrevious();
        break;
      case "ArrowRight":
        if (!inTabs) goNext();
        break;
      case "ArrowUp":
        moveTab(-1);
        break;
      case "ArrowDown":
        moveTab(1);
        break;
      case "a":
      case "A":
        anotherFact();
        break;
      case "b":
      case "B":
        onClose();
        break;
      default:
        return;
    }
    event.preventDefault();
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const closeLabel = mode === "modal" ? "Cerrar el Ronrón" : "Volver al Michiverso";

  return (
    <article ref={rootRef} aria-labelledby="ronron-name" className="relative mx-auto w-full max-w-[1100px] pt-14">
      {/* Orejas: cuadrados girados 45° que asoman tras la carcasa. */}
      <div ref={earsRef} aria-hidden="true" data-device-ears>
        {(["left", "right"] as const).map((side) => (
          <div
            key={side}
            // La rotación va en `transform` (no en la clase `rotate-45`, que usa la
            // propiedad `rotate`): así GSAP la anima sin sumarse a otra.
            style={{ transform: "rotate(45deg)" }}
            className={
              side === "left"
                ? "metal-shell absolute top-3 left-[7%] size-24 rounded-[24px] sm:left-[9%] sm:size-32 sm:rounded-[30px]"
                : "metal-shell absolute top-3 right-[7%] size-24 rounded-[24px] sm:right-[9%] sm:size-32 sm:rounded-[30px]"
            }
          >
            <div className="well absolute inset-[26%] rounded-[14px]" />
          </div>
        ))}
      </div>

      <div className="absolute top-6 left-[27%] z-0 hidden sm:block" data-device-shoulder>
        <ShoulderButton letter="L" aria-label="Pestaña anterior" onClick={() => moveTab(-1)} />
      </div>
      <div className="absolute top-6 right-[27%] z-0 hidden sm:block" data-device-shoulder>
        <ShoulderButton letter="R" aria-label="Pestaña siguiente" onClick={() => moveTab(1)} />
      </div>

      <div
        data-device-shell
        // Carcasa de aluminio (cepillado vertical, chaflán) con un frontal de
        // porcelana hundido: el contraste metal/blanco de una consola de mano.
        className="metal-shell relative z-10 rounded-[46px] p-2 sm:p-2.5"
      >
        <div className="rounded-[39px] bg-[linear-gradient(180deg,var(--surface),var(--paper))] p-3 shadow-[inset_0_0_0_1px_var(--alu-mid),inset_0_2px_6px_-2px_var(--alu-lo)] sm:p-4">
          {/*
            Distribución de consola de mano:
            1. arriba, el visor y la pantalla de datos, a la misma altura (la
               pantalla toma la del visor con h-0 + min-h-full y desplaza su
               contenido por dentro: cambiar de pestaña no mueve nada);
            2. abajo, como la mitad inferior de una DS: cruceta, la pantalla del
               dato curioso y B/A, cada uno en su pista de la rejilla;
            3. al pie, una franja fina con la marca, los atajos y el altavoz.
            En móvil y tableta el dato va a todo lo ancho y los controles debajo.
          */}
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)]">
            <div data-device-part>
              {/* Cada bloque en su <Suspense>: nada suspende, pero React hidrata
                  por tandas cortas en vez de una sola tarea larga. */}
              <Suspense fallback={null}>
                <DeviceVisor
                  name={breed.name}
                  photo={profile?.photo ?? null}
                  sourceUrl={profile?.source.url ?? null}
                  position={dossier.position}
                  total={dossier.total}
                  isNew={isNew}
                  priority
                />
              </Suspense>
            </div>

            <div data-device-part className="flex min-w-0 flex-col lg:h-0 lg:min-h-full">
              <Suspense fallback={null}>
                <DeviceScreen
                  breed={breed}
                  profile={profile}
                  coats={dossier.coats}
                  total={dossier.total}
                  related={dossier.related}
                  relatedPhotos={dossier.relatedPhotos}
                  tab={tab}
                  onTabChange={setTab}
                  onOpenRelated={(slug) => onNavigate(slug, 1)}
                />
              </Suspense>
            </div>

            <div
              data-device-part
              // Áreas con nombre: la misma pieza cambia de sitio sin duplicarse.
              // Móvil/tableta: dato arriba; cruceta · centro · B/A debajo.
              // Escritorio: cruceta · dato · B/A, y la franja de la marca al pie.
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-4 [grid-template-areas:'fact_fact_fact'_'pad_mid_btn'] sm:gap-x-6 lg:col-span-2 lg:gap-x-7 lg:gap-y-3 lg:[grid-template-areas:'pad_fact_btn'_'mid_mid_mid']"
            >
              <div className="min-w-0 [grid-area:fact] lg:h-0 lg:min-h-full">
                <Suspense fallback={null}>
                  <FactLcd fact={fact} />
                </Suspense>
              </div>

              <div className="pl-1 [grid-area:pad] sm:pl-2">
                <Suspense fallback={null}>
                  <DPad
                    onLeft={goPrevious}
                    onRight={goNext}
                    onUp={() => moveTab(-1)}
                    onDown={() => moveTab(1)}
                    leftLabel={previous ? `Raza anterior: ${previous.name}` : "No hay raza anterior"}
                    rightLabel={next ? `Raza siguiente: ${next.name}` : "No hay raza siguiente"}
                    canLeft={Boolean(previous)}
                    canRight={Boolean(next)}
                  />
                </Suspense>
              </div>

              {/* Marca grabada con su LED, los dos atajos y el altavoz. En
                  tableta van apilados entre la cruceta y B/A; en escritorio
                  forman la franja del pie. */}
              <div className="flex min-w-0 flex-col items-center gap-3 [grid-area:mid] max-sm:invisible lg:flex-row lg:justify-between lg:px-2">
                <p className="flex items-center gap-2 lg:w-44" aria-hidden="true">
                  <EngravedMark />
                  <PowerLed />
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <PillButton onClick={random}>Al azar</PillButton>
                  <PillButton onClick={() => void share()}>Compartir</PillButton>
                </div>
                <div className="hidden lg:flex lg:w-44 lg:justify-end">
                  <Speaker />
                </div>
              </div>

              <div className="flex items-end gap-4 pr-1 [grid-area:btn] sm:gap-5 sm:pr-2">
                <RoundButton
                  letter="B"
                  caption={mode === "modal" ? "Cerrar" : "Volver"}
                  tone="b"
                  aria-label={closeLabel}
                  onClick={onClose}
                />
                <div className="mb-6">
                  <RoundButton
                    letter="A"
                    caption="Otro dato"
                    tone="a"
                    aria-label="Otro dato curioso"
                    onClick={anotherFact}
                    disabled={fact.isFetching}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-center gap-2 sm:hidden">
            <PillButton onClick={random}>Al azar</PillButton>
            <PillButton onClick={() => void share()}>Compartir</PillButton>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * "RONRÓN" grabado en la carcasa: un logotipo, no texto de lectura (el
 * nombre accesible del dispositivo está en el título de la ficha). Va en
 * SVG con un filo claro debajo, como una marca en relieve sobre plástico.
 */
function EngravedMark() {
  const text = {
    x: 2,
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: "0.28em",
    fontFamily: "var(--font-rubik)",
  };
  return (
    <svg viewBox="0 0 150 26" className="h-5 w-auto max-w-full" aria-hidden="true">
      <text {...text} y={21} fill="var(--alu-hi)" opacity={0.9}>
        RONRÓN
      </text>
      <text {...text} y={20} fill="var(--slate)" opacity={0.3}>
        RONRÓN
      </text>
    </svg>
  );
}
