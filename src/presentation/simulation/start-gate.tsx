"use client";

import { Check, LoaderCircle, Play } from "lucide-react";
import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";
import { CatMark } from "../brand/cat-mark";
import { Logo } from "../brand/logo";
import { Sparkle } from "../brand/sparkle";
import { loadFieldEngine } from "../field/load-engine";
import { cn } from "../lib/cn";
import { padIndex } from "../lib/format";
import { loadGsap, readyGsap, useGsap, type Gsap } from "../lib/gsap";
import { playCue } from "../lib/sound";
import { ConsoleClock } from "../top-bar/status";
import { useSimulationStore, type SimulationPhase } from "./simulation-store";

interface StartGateProps {
  phase: SimulationPhase;
  /** Todo cargó: el iris del campo se abre y esta pantalla se atraviesa. */
  arriving: boolean;
  /** El túnel ya se pinta en el canvas: el fondo liso de esta pantalla puede irse. */
  tunnelVisible: boolean;
  total: number;
  onStart: () => void;
  /** Llamado al terminar la salida. */
  onLeft: () => void;
}

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Pantalla de inicio: el HUD de una consola en espera.
 *
 * Un marco técnico (rejilla de plano, esquinas, lecturas en los cuatro
 * rincones) y en el centro una retícula: anillo de marcas, arcos que giran,
 * un aro iridiscente y el disco de perla con el gato, que es el botón. Al
 * pulsarlo:
 *  1. el disco se hunde y rebota, una onda y destellos salen de él y la
 *     retícula acelera (GSAP, solo transform/opacity);
 *  2. el disco pasa a ser el indicador de carga: un porcentaje LCD y cuatro
 *     arcos, uno por paso real (motor, cielo, razas, orbes);
 *  3. al llegar, la retícula y el disco se atraviesan (escala + opacidad)
 *     mientras en WebGL se abre el iris del velo sobre el campo, y las
 *     lecturas de los rincones salen por los bordes.
 * Las capas que giran lo hacen con animaciones CSS de transform: compositor.
 */
export function StartGate({ phase, arriving, tunnelVisible, total, onStart, onLeft }: StartGateProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<HTMLDivElement>(null);
  const steps = useSimulationStore((state) => state.steps);
  const started = phase !== "gate";
  // GSAP llega en su chunk justo después de hidratar: el disco empieza a
  // flotar entonces (desde el reposo, así que no se nota la espera).
  const { gsap } = useGsap();

  const done = steps.filter((step) => step.done).length;
  const percent = Math.round((done / steps.length) * 100);

  // En espera, el disco flota y respira; nunca un movimiento brusco.
  useEffect(() => {
    const button = buttonRef.current;
    if (!gsap || !button || started || reduced()) return;
    const tween = gsap.to(button, { y: -6, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
    return () => {
      tween.kill();
    };
  }, [gsap, started]);

  // El fondo liso se va (opacidad) cuando el túnel ya se pinta debajo.
  useEffect(() => {
    const background = rootRef.current?.querySelector<HTMLElement>("[data-gate-bg]");
    if (!tunnelVisible || !background) return;
    const gsap = readyGsap();
    if (gsap) gsap.to(background, { opacity: 0, duration: 0.6, ease: "sine.inOut" });
    else background.style.opacity = "0";
  }, [tunnelVisible]);

  // Salida: se atraviesa la retícula mientras el iris del campo se abre.
  const leave = useEffectEvent(() => onLeft());
  useEffect(() => {
    const root = rootRef.current;
    if (!arriving || !root) return;
    const gsap = readyGsap();
    if (!gsap || reduced()) {
      leave();
      return;
    }
    const corners = root.querySelectorAll<HTMLElement>("[data-gate-corner]");
    const tl = gsap
      .timeline({ onComplete: () => leave() })
      .to(reticleRef.current, { scale: 2.8, opacity: 0, duration: 1, ease: "power3.in" }, 0)
      .to(buttonRef.current, { scale: 3.6, opacity: 0, duration: 0.85, ease: "power3.in" }, 0)
      .to(root.querySelectorAll("[data-gate-steps]"), { y: 24, opacity: 0, duration: 0.4, ease: "power2.in" }, 0)
      .to(
        corners,
        {
          x: (i) => (i % 2 === 0 ? -48 : 48),
          y: (i) => (i < 2 ? -24 : 24),
          opacity: 0,
          duration: 0.6,
          ease: "power2.in",
        },
        0.05,
      )
      .to(root.querySelector("[data-gate-grid]"), { opacity: 0, duration: 0.7, ease: "sine.inOut" }, 0.1);
    return () => {
      tl.kill();
    };
  }, [arriving]);

  const start = () => {
    if (started) return;
    playCue("arrival");
    void loadFieldEngine();
    onStart();
    if (reduced()) return;
    const run = (gsap: Gsap) => {
      const sparks = burstRef.current?.children ?? [];
      gsap
        .timeline()
        // El disco se hunde y rebota, como un botón de verdad.
        .to(buttonRef.current, { y: 0, scale: 0.92, duration: 0.12, ease: "power2.out" }, 0)
        .to(buttonRef.current, { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.45)" }, 0.12)
        // Onda de luz que sale del disco.
        .fromTo(waveRef.current, { scale: 0.7, opacity: 0.7 }, { scale: 2.6, opacity: 0, duration: 1.1, ease: "power2.out" }, 0.08)
        // Destellos que saltan hacia fuera y se apagan.
        .fromTo(
          sparks,
          { x: 0, y: 0, scale: 0, opacity: 1 },
          {
            x: (i) => Math.cos((i / sparks.length) * Math.PI * 2 - Math.PI / 2) * 190,
            y: (i) => Math.sin((i / sparks.length) * Math.PI * 2 - Math.PI / 2) * 190,
            scale: 1,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.02,
          },
          0.1,
        )
        // La retícula acelera (una vuelta extra encima de su giro lento).
        .fromTo(reticleRef.current, { scale: 1 }, { scale: 0.94, duration: 0.18, ease: "power2.out" }, 0)
        .to(reticleRef.current, { scale: 1, duration: 0.9, ease: "elastic.out(1, 0.5)" }, 0.18)
        .to(spinRef.current, { rotation: "+=140", duration: 1.8, ease: "power2.inOut" }, 0);
    };
    // En táctil el toque llega a la vez que la descarga de GSAP: se espera
    // (décimas) en vez de saltarse el momento más importante.
    const ready = readyGsap();
    if (ready) run(ready);
    else void loadGsap().then(run, () => {});
  };

  const status = arriving ? "Listo" : started ? "Enlazando" : "En espera";

  return (
    <div ref={rootRef} className={cn("fixed inset-0 z-30 overflow-hidden", started && "pointer-events-none")}>
      <div data-gate-bg aria-hidden="true" className="absolute inset-0 bg-[var(--gate)]" />
      {/* Rejilla de plano técnico y un resplandor en el centro. */}
      <div data-gate-grid aria-hidden="true" className="absolute inset-0">
        <div className="hud-grid absolute inset-0" />
        <div className="absolute top-1/2 left-1/2 size-[min(120vmin,900px)] -translate-1/2 animate-breathe rounded-full bg-[radial-gradient(circle,var(--accent-soft)_0%,transparent_62%)]" />
      </div>

      {/* Esquinas del marco con sus lecturas. */}
      <Corner position="top-left">
        <Logo />
        <p className="hud mt-2.5 text-ink-soft">Simulación de razas felinas</p>
      </Corner>
      <Corner position="top-right" align="end">
        <ConsoleClock className="flex" />
      </Corner>
      <Corner position="bottom-left" className="max-sm:hidden">
        <dl className="grid grid-cols-[auto_auto] items-baseline gap-x-4 gap-y-1.5">
          <dt className="hud text-ink-soft">Razas</dt>
          <dd className="lcd text-[1.05rem] text-ink">{total > 0 ? padIndex(total) : "---"}</dd>
          <dt className="hud text-ink-soft">Datos</dt>
          <dd className="text-[0.8rem] font-semibold text-slate">catfact.ninja · Wikipedia</dd>
        </dl>
      </Corner>
      <Corner position="bottom-right" align="end">
        <p className="hud flex items-center gap-2 text-ink-soft" aria-hidden="true">
          {started ? (
            <>
              <span className="size-1.5 animate-blink rounded-full bg-accent" />
              {status}
            </>
          ) : (
            <>
              {/* Con teclado, la tecla; en táctil, solo el gesto. */}
              <span className="flex items-center gap-2 pointer-coarse:hidden">
                Pulsa
                <kbd className="pearl grid h-6 place-items-center rounded-[7px] px-2 font-sans text-[0.7rem] font-semibold tracking-normal text-slate normal-case">
                  Enter
                </kbd>
                o toca el orbe
              </span>
              <span className="hidden pointer-coarse:inline">Toca el orbe para empezar</span>
            </>
          )}
        </p>
      </Corner>

      {/* Retícula: exactamente en el centro de la pantalla (ahí se abre el iris). */}
      <div
        ref={reticleRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-[min(96vmin,640px)] -translate-1/2 sm:size-[min(88vmin,640px)]"
      >
        <div ref={spinRef} className="absolute inset-0">
          <svg viewBox="0 0 400 400" className="absolute inset-0 size-full animate-[spin_90s_linear_infinite] text-ring-strong/60">
            <path d={TICKS} stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
        <svg viewBox="0 0 400 400" className="absolute inset-[7%] size-[86%] animate-[spin_50s_linear_infinite_reverse] text-accent/55">
          <circle cx="200" cy="200" r="196" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="120 64 8 64" strokeLinecap="round" />
          <circle cx="200" cy="4" r="4" fill="currentColor" />
          <circle cx="396" cy="200" r="3" fill="currentColor" />
        </svg>
        {/* Aro iridiscente (Y2K): un cónico enmascarado en anillo que gira. */}
        <div className="absolute inset-[17%] animate-[spin_14s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,var(--glint),var(--accent),var(--ring),var(--glint),var(--gel-hi),var(--glint))] opacity-80 [mask:radial-gradient(circle_closest-side,transparent_calc(100%-3px),black_calc(100%-2.5px),black_calc(100%-0.5px),transparent_100%)]" />
        {/* Progreso real: un arco por paso. */}
        {steps.map((step, i) => (
          <svg
            key={step.id}
            viewBox="0 0 400 400"
            className={cn(
              "absolute inset-[11%] size-[78%] text-accent transition-opacity duration-500",
              !started ? "opacity-0" : step.done ? "opacity-100" : "opacity-15",
            )}
          >
            <path d={arc(i, steps.length)} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          </svg>
        ))}
        {/* Rótulos de la retícula. */}
        <span className="hud absolute top-[3%] left-1/2 -translate-x-1/2 text-ink-soft">SIM·01</span>
        <span className="absolute top-1/2 right-[1%] flex -translate-y-1/2 flex-col items-end gap-1 max-sm:hidden">
          <span className="lcd text-[0.95rem] text-slate">{total > 0 ? padIndex(total) : "---"}</span>
          <span className="hud text-[0.5rem] text-ink-soft">Razas</span>
        </span>
        <span className="hud absolute bottom-[3%] left-1/2 -translate-x-1/2 text-accent">{status}</span>
        <span className="lcd absolute top-1/2 left-[1%] -translate-y-1/2 text-[0.95rem] text-slate max-sm:hidden">
          {started ? `${String(percent).padStart(3, "0")}%` : "000%"}
        </span>
        <Sparkle className="absolute top-[22%] right-[24%] size-6 text-glint" />
        <Sparkle className="absolute bottom-[25%] left-[21%] size-4 text-accent" delay={1.4} />
        <Sparkle className="absolute top-[30%] left-[18%] size-3 text-glint" delay={2.3} />
      </div>

      {/* El disco: el botón de inicio. */}
      <div className="absolute top-1/2 left-1/2 grid -translate-1/2 place-items-center">
        <div ref={waveRef} aria-hidden="true" className="absolute size-60 rounded-full border-2 border-accent opacity-0" />
        <div ref={burstRef} aria-hidden="true" className="absolute grid place-items-center">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="absolute opacity-0">
              <Sparkle className="size-4 animate-none text-glint" />
            </span>
          ))}
        </div>
        <button
          ref={buttonRef}
          type="button"
          autoFocus
          onClick={start}
          onPointerEnter={() => void loadFieldEngine()}
          onFocus={() => void loadFieldEngine()}
          disabled={started}
          aria-describedby="gate-hint"
          data-cue="primary"
          // El logo hecho botón: un disco de perla abombado con el gato en
          // pizarra y la acción en una píldora de gel.
          className="pearl-button select-frame group relative grid size-[min(60vmin,15rem)] place-items-center rounded-full outline-offset-8 transition-transform duration-300 ease-[var(--ease-cozy)] hover:scale-[1.03] sm:size-64"
        >
          <span className="flex flex-col items-center gap-3">
            <CatMark ring={false} className="-mt-1 size-[min(20vmin,6rem)] transition-transform duration-500 ease-[var(--ease-pop)] group-hover:scale-105 sm:size-28" />
            <span className="relative grid place-items-center">
              <span
                className={cn(
                  "gel flex items-center gap-2 rounded-full py-2 pr-4 pl-2 font-display text-[0.84rem] leading-none font-bold whitespace-nowrap transition-opacity duration-300 sm:text-base",
                  started && "opacity-0",
                )}
              >
                <span className="grid size-6 place-items-center rounded-full bg-gel-ink/25">
                  <Play className="ml-px size-3 fill-current" aria-hidden="true" />
                </span>
                Empezar simulación
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "absolute flex flex-col items-center gap-1 transition-opacity duration-300",
                  started ? "opacity-100" : "opacity-0",
                )}
              >
                <span className="lcd text-2xl leading-none text-accent">{String(percent).padStart(3, "0")}%</span>
                <span className="hud text-[0.52rem] text-ink-soft">Enlazando</span>
              </span>
            </span>
          </span>
        </button>
      </div>

      <p id="gate-hint" className="sr-only">
        {total > 0 ? `${total} razas te esperan.` : "Las razas te esperan."} Pulsa el orbe o Enter.
      </p>

      {/* Pasos reales de la carga, bajo la retícula. */}
      <div
        data-gate-steps
        role="status"
        aria-live="polite"
        className={cn(
          "absolute inset-x-0 bottom-[9vh] flex justify-center px-4 transition-opacity duration-500 max-sm:bottom-[14vh]",
          started ? "opacity-100" : "invisible opacity-0",
        )}
      >
        <ul className="flex flex-wrap justify-center gap-2">
          {steps.map((step) => (
            <li
              key={step.id}
              className={cn(
                "pearl relative isolate flex items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-semibold",
                // El relleno de "listo" es una capa de gel que crece y se funde.
                "before:absolute before:inset-0 before:-z-10 before:scale-75 before:rounded-full before:bg-[linear-gradient(180deg,var(--gel-gloss)_0%,transparent_46%),linear-gradient(180deg,var(--gel-hi),var(--gel)_58%,var(--gel-lo))] before:opacity-0 before:transition-[opacity,transform] before:duration-500 before:ease-[var(--ease-cozy)]",
                step.done ? "text-gel-ink before:scale-100 before:opacity-100" : "text-ink-soft",
              )}
            >
              {step.done ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : (
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
              )}
              {step.label}
              <span className="sr-only">{step.done ? " listo" : " cargando"}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Esquina del marco: un corchete de dos filetes y su bloque de lectura. */
function Corner({
  position,
  align = "start",
  className,
  children,
}: {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  align?: "start" | "end";
  className?: string;
  children: ReactNode;
}) {
  const [v, h] = position.split("-") as ["top" | "bottom", "left" | "right"];
  return (
    <div
      data-gate-corner
      className={cn(
        "absolute flex flex-col p-4 sm:p-5",
        v === "top" ? "top-3 sm:top-5" : "bottom-3 sm:bottom-5",
        h === "left" ? "left-3 sm:left-5" : "right-3 sm:right-5",
        align === "end" && "items-end text-right",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute size-4 border-accent/50",
          v === "top" ? "top-0 border-t-[1.5px]" : "bottom-0 border-b-[1.5px]",
          h === "left" ? "left-0 border-l-[1.5px]" : "right-0 border-r-[1.5px]",
        )}
      />
      {children}
    </div>
  );
}

/** 120 marcas en círculo (una cada 3°; cada 10ª, más larga), en un solo trazo. */
const TICKS = Array.from({ length: 120 }, (_, i) => {
  const angle = (i / 120) * Math.PI * 2;
  const inner = i % 10 === 0 ? 176 : 186;
  const x1 = 200 + Math.cos(angle) * inner;
  const y1 = 200 + Math.sin(angle) * inner;
  const x2 = 200 + Math.cos(angle) * 196;
  const y2 = 200 + Math.sin(angle) * 196;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
}).join("");

/** Arco i de n alrededor del centro, empezando arriba y con un hueco entre arcos. */
function arc(i: number, n: number) {
  const gap = 0.08;
  const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + gap;
  const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - gap;
  const r = 190;
  const p = (a: number) => `${(200 + Math.cos(a) * r).toFixed(1)} ${(200 + Math.sin(a) * r).toFixed(1)}`;
  return `M${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}`;
}
