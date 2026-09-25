"use client";

import { Suspense, useCallback, useEffect, useEffectEvent, useId, useMemo, useRef, useState, type Ref } from "react";
import type { BreedDossier } from "@application/use-cases/get-breed-dossier";
import { cn } from "../lib/cn";
import { readyGsap } from "../lib/gsap";
import { notify } from "../lib/notify";
import { playCue } from "../lib/sound";
import { useDiscoveryStore } from "../stores/discovery-store";
import { Sparkle } from "../brand/sparkle";
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
 * Una consola de bolsillo de dos piezas, como una DS: la tapa con el visor
 * (la foto completa) y la pantalla de datos con pestañas; la base con la
 * pantalla del dato curioso y controles físicos que funcionan de verdad.
 * Las orejas y los gatillos flotan sueltos sobre la tapa:
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

  // Las orejas se mueven un poco cada vez que cambia la raza (el giro va
  // en la pieza de fuera; la de dentro sigue flotando con CSS).
  useEffect(() => {
    const ears = earsRef.current?.children;
    const gsap = readyGsap();
    if (!gsap || !ears || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tl = gsap.timeline({ delay: 0.35 });
    tl.to(ears[0], { rotate: -9, duration: 0.14, ease: "power2.out" })
      .to(ears[0], { rotate: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" })
      .to(ears[1], { rotate: 9, duration: 0.14, ease: "power2.out" }, 0.08)
      .to(ears[1], { rotate: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
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
    <article ref={rootRef} aria-labelledby="ronron-name" className="relative mx-auto w-full max-w-[1100px] pt-[5rem] sm:pt-[6.25rem]">
      {/* Orejas: dos piezas sueltas que flotan sobre la tapa, con aire entre
          ellas y la carcasa. La de fuera se mueve con GSAP (el meneo al
          cambiar de raza); la de dentro flota con CSS (compositor). */}
      <div ref={earsRef} aria-hidden="true" data-device-ears>
        <div className="absolute top-2 left-[9%] w-[4.5rem] origin-bottom sm:top-1.5 sm:left-[10%] sm:w-[6.5rem]">
          <Ear className="-rotate-[14deg] animate-[float_5.5s_var(--ease-soft)_infinite]" />
        </div>
        <div className="absolute top-2 right-[9%] w-[4.5rem] origin-bottom sm:top-1.5 sm:right-[10%] sm:w-[6.5rem]">
          <Ear className="rotate-[14deg] animate-[float_5.5s_var(--ease-soft)_-2.7s_infinite]" />
        </div>
      </div>

      {/* Gatillos L/R: sueltos también, flotando entre las orejas. */}
      <div className="absolute top-12 left-[27%] z-0 hidden sm:block" data-device-shoulder>
        <div className="animate-[float_4.8s_var(--ease-soft)_-1.2s_infinite]">
          <ShoulderButton letter="L" aria-label="Pestaña anterior" onClick={() => moveTab(-1)} />
        </div>
      </div>
      <div className="absolute top-12 right-[27%] z-0 hidden sm:block" data-device-shoulder>
        <div className="animate-[float_4.8s_var(--ease-soft)_-3.4s_infinite]">
          <ShoulderButton letter="R" aria-label="Pestaña siguiente" onClick={() => moveTab(1)} />
        </div>
      </div>

      {/*
        Tapa: el visor y la pantalla de datos, a la misma altura (la pantalla
        toma la del visor con h-0 + min-h-full y desplaza su contenido por
        dentro: cambiar de pestaña no mueve nada). Gira sobre la bisagra al
        abrirse (ver device-motion.ts).
      */}
      <div data-device-lid className="shell squircle relative z-10 rounded-[40px] p-3 [backface-visibility:hidden] sm:p-4">
        <Sparkle className="absolute -top-3 -right-2 size-7 text-glint" />
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
        </div>
      </div>

      {/* Bisagra: dos topes y la ranura entre tapa y base. */}
      <div aria-hidden="true" data-device-hinge className="relative mx-auto flex h-3 w-[62%] items-center gap-2 sm:h-3.5">
        <span className="shell h-full w-14 rounded-full sm:w-20" />
        <span className="h-1.5 flex-1 rounded-full bg-[var(--shade)] shadow-[inset_0_1px_2px_var(--shadow-soft)]" />
        <span className="shell h-full w-14 rounded-full sm:w-20" />
      </div>

      {/*
        Base, como la mitad inferior de una DS: cruceta, la pantalla del dato
        curioso y B/A, cada uno en su pista (áreas con nombre: la misma pieza
        cambia de sitio sin duplicarse); al pie, la marca, los atajos y el
        altavoz. En móvil y tableta el dato va arriba, a todo lo ancho.
      */}
      <div data-device-base className="shell squircle relative z-10 rounded-[40px] p-3 sm:p-4">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-4 [grid-template-areas:'fact_fact_fact'_'pad_mid_btn'] sm:gap-x-6 lg:gap-x-7 lg:gap-y-3 lg:[grid-template-areas:'pad_fact_btn'_'mid_mid_mid']">
          <div data-device-part className="min-w-0 [grid-area:fact] lg:h-0 lg:min-h-full">
            <Suspense fallback={null}>
              <FactLcd fact={fact} />
            </Suspense>
          </div>

          <div data-device-control className="pl-1 [grid-area:pad] sm:pl-2">
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

          {/* Marca con su LED, los dos atajos y el altavoz. En tableta van
              apilados entre la cruceta y B/A; en escritorio forman el pie. */}
          <div className="flex min-w-0 flex-col items-center gap-3 [grid-area:mid] max-sm:invisible lg:flex-row lg:justify-between lg:px-2">
            <p className="flex items-center gap-2.5 lg:w-48" aria-hidden="true">
              <Wordmark />
              <PowerLed />
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <PillButton onClick={random}>Al azar</PillButton>
              <PillButton onClick={() => void share()}>Compartir</PillButton>
            </div>
            <div className="hidden items-center gap-3 lg:flex lg:w-48 lg:justify-end">
              <Barcode seed={breed.slug} />
              <Speaker />
            </div>
          </div>

          <div data-device-control className="flex items-end gap-4 pr-1 [grid-area:btn] sm:gap-5 sm:pr-2">
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

        <div className="mt-4 flex justify-center gap-2 sm:hidden">
          <PillButton onClick={random}>Al azar</PillButton>
          <PillButton onClick={() => void share()}>Compartir</PillButton>
        </div>
        <Sparkle className="absolute -bottom-2.5 -left-2 size-5 text-glint" delay={1.6} />
      </div>
    </article>
  );
}

/**
 * Oreja suelta: un triángulo de esquinas muy redondas en el plástico de la
 * carcasa, con el interior en gel lavanda, un brillo de burbuja y un LED.
 */
function Ear({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 120 96" className={cn("block w-full drop-shadow-[0_10px_14px_var(--shadow-soft)]", className)}>
      <defs>
        <linearGradient id={`${id}-shell`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--shell-hi)" />
          <stop offset="1" stopColor="var(--shell-lo)" />
        </linearGradient>
        <linearGradient id={`${id}-gel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gel-hi)" />
          <stop offset="1" stopColor="var(--ring)" />
        </linearGradient>
      </defs>
      <path
        d="M22 92 Q5 92 13 77 L49 17 Q60 -1 71 17 L107 77 Q115 92 98 92 Z"
        fill={`url(#${id}-shell)`}
        stroke="var(--hairline)"
        strokeWidth="1.5"
      />
      <path d="M40 80 Q31 80 36 71 L54 39 Q60 29 66 39 L84 71 Q89 80 80 80 Z" fill={`url(#${id}-gel)`} opacity="0.85" />
      {/* Brillo de burbuja en el gel y un LED diminuto: el toque "cyber". */}
      <ellipse cx="55" cy="52" rx="3.2" ry="6" transform="rotate(28 55 52)" fill="var(--gel-gloss)" />
      <circle cx="60" cy="72" r="2.6" fill="var(--glint)" />
    </svg>
  );
}

/**
 * "RONRÓN" como marca de la carcasa: Hubot extendida, en el pizarra del
 * logo. Es un logotipo, no texto de lectura (el nombre accesible del
 * dispositivo está en el título de la ficha).
 */
function Wordmark() {
  return (
    <span className="font-display text-[0.95rem] leading-none font-extrabold tracking-[0.2em] text-slate/75">
      RONRÓN
    </span>
  );
}

/**
 * Código de barras de la pieza, como la etiqueta de un aparato. Decorativo:
 * las barras salen del nombre de la raza (siempre las mismas para cada una)
 * y se pintan en un solo elemento con un degradado de franjas duras.
 */
function Barcode({ seed }: { seed: string }) {
  const background = useMemo(() => {
    const stops: string[] = [];
    let x = 0;
    for (const width of barWidths(seed)) {
      stops.push(`var(--slate) ${x}px ${x + width}px`, `transparent ${x + width}px ${x + width + 2}px`);
      x += width + 2;
    }
    return { backgroundImage: `linear-gradient(to right, ${stops.join(", ")})`, width: x };
  }, [seed]);
  return <span aria-hidden="true" className="block h-5 opacity-45" style={background} />;
}

/** Anchos de 1 a 3 px a partir de un hash FNV-1a del texto. */
function barWidths(seed: string): number[] {
  const widths: number[] = [];
  let h = 2166136261;
  for (let i = 0; i < 22; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i % seed.length), 16777619);
    widths.push(1 + ((h >>> 0) % 3));
  }
  return widths;
}
