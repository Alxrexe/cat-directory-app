"use client";

import { Check, LoaderCircle, Play } from "lucide-react";
import { useEffect, useEffectEvent, useRef } from "react";
import { Logo } from "../brand/logo";
import { CatMark } from "../brand/cat-mark";
import { loadFieldEngine } from "../field/load-engine";
import { cn } from "../lib/cn";
import { loadGsap, readyGsap, useGsap, type Gsap } from "../lib/gsap";
import { playCue } from "../lib/sound";
import { useSimulationStore, type SimulationPhase } from "./simulation-store";

interface StartGateProps {
  phase: SimulationPhase;
  /** El túnel ya se pinta en el canvas: el fondo de esta pantalla puede irse. */
  tunnelVisible: boolean;
  total: number;
  onStart: () => void;
  /** Llamado al terminar el fundido de salida. */
  onLeft: () => void;
}

/**
 * Pantalla de inicio, a la manera de un "link start": fondo liso, un único
 * orbe-gato en el centro y nada más. Al pulsarlo:
 *  1. el orbe se hunde y estalla en una onda (GSAP, solo transform/opacity);
 *  2. el motor 3D empieza a cargar (ya precargado si el puntero se acercó);
 *  3. cuando el túnel está en el canvas, este fondo se desvanece encima de
 *     él y queda el panel de carga con los pasos reales.
 */
export function StartGate({ phase, tunnelVisible, total, onStart, onLeft }: StartGateProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const steps = useSimulationStore((state) => state.steps);
  const barRef = useRef<HTMLDivElement>(null);
  const started = phase !== "gate";
  // GSAP llega en su chunk justo después de hidratar: el orbe empieza a
  // flotar entonces (desde el reposo, así que no se nota la espera).
  const { gsap } = useGsap();

  // Idle: el orbe flota y respira; nunca un movimiento brusco.
  useEffect(() => {
    const button = buttonRef.current;
    if (!gsap || !button || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tween = gsap.to(button, {
      y: -8,
      duration: 2.6,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    return () => {
      tween.kill();
    };
  }, [gsap]);

  // Progreso real: pasos completados / pasos totales.
  const done = steps.filter((step) => step.done).length;
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const scaleX = Math.max(0.04, done / steps.length);
    if (gsap) gsap.to(bar, { scaleX, duration: 0.8, ease: "power2.out" });
    else bar.style.transform = `scaleX(${scaleX})`;
  }, [done, steps.length, gsap]);

  // El fondo del gate se va (opacidad, compositor) cuando el túnel ya está debajo.
  useEffect(() => {
    const background = rootRef.current?.querySelector<HTMLElement>("[data-gate-bg]");
    if (!tunnelVisible || !background) return;
    const gsap = readyGsap();
    if (gsap) gsap.to(background, { opacity: 0, duration: 0.6, ease: "sine.inOut" });
    else background.style.opacity = "0";
  }, [tunnelVisible]);

  // Salida: el panel de carga se desvanece durante el destello de llegada.
  const leave = useEffectEvent(() => onLeft());
  useEffect(() => {
    if (phase !== "running" || !rootRef.current) return;
    const gsap = readyGsap();
    if (!gsap) {
      leave();
      return;
    }
    const tween = gsap.to(rootRef.current, {
      opacity: 0,
      duration: 0.7,
      ease: "sine.inOut",
      onComplete: () => leave(),
    });
    return () => {
      tween.kill();
    };
  }, [phase]);

  const start = () => {
    if (started) return;
    playCue("arrival");
    void loadFieldEngine();
    onStart();
    const root = rootRef.current;
    if (!root) return;
    const fallback = () => {
      // Sin GSAP (sin red): mismo resultado, sin animación.
      for (const node of root.querySelectorAll<HTMLElement>("[data-gate-fade]")) node.style.opacity = "0";
      if (buttonRef.current) buttonRef.current.style.opacity = "0";
      root.querySelector<HTMLElement>("[data-gate-hud]")?.style.setProperty("opacity", "1");
    };
    const run = (gsap: Gsap) => {
      gsap
        .timeline()
        .to(buttonRef.current, {
          scale: 0.9,
          duration: 0.14,
          ease: "power2.out",
        })
        .to(buttonRef.current, {
          scale: 1.12,
          opacity: 0,
          duration: 0.55,
          ease: "power3.in",
        })
        .fromTo(
          waveRef.current,
          { scale: 0.6, opacity: 0.55 },
          { scale: 9, opacity: 0, duration: 1.3, ease: "power2.out" },
          0.1,
        )
        .to(
          root.querySelectorAll("[data-gate-fade]"),
          {
            y: -14,
            opacity: 0,
            duration: 0.5,
            stagger: 0.06,
            ease: "power2.in",
          },
          0.05,
        )
        .fromTo(
          root.querySelector("[data-gate-hud]"),
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
          0.45,
        );
    };
    // En táctil el toque llega a la vez que la descarga de GSAP: se espera
    // (décimas) en vez de saltarse el momento más importante.
    const ready = readyGsap();
    if (ready) run(ready);
    else loadGsap().then(run, fallback);
  };

  return (
    <div
      ref={rootRef}
      className={cn("fixed inset-0 z-30 flex flex-col items-center justify-center", started && "pointer-events-none")}
    >
      <div data-gate-bg aria-hidden="true" className="absolute inset-0 bg-[var(--gate)]" />
      {/* Anillos del "enlace": decorativos, giran muy despacio. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 800 800"
        className="pointer-events-none absolute size-[min(120vmin,1100px)] text-ring"
        data-gate-fade
      >
        <g fill="none" stroke="currentColor" className="origin-center animate-[spin_90s_linear_infinite]">
          <circle cx="400" cy="400" r="380" strokeWidth="1" strokeDasharray="2 14" />
          <circle cx="400" cy="400" r="300" strokeWidth="1" />
        </g>
        <g fill="none" stroke="currentColor" className="origin-center animate-[spin_140s_linear_infinite_reverse]">
          <circle cx="400" cy="400" r="220" strokeWidth="1" strokeDasharray="40 18" />
        </g>
      </svg>

      <div className="relative flex flex-col items-center gap-10 px-4 text-center">
        <div data-gate-fade className="flex flex-col items-center gap-3">
          <Logo />
          <p className="hud text-ink-soft">Simulación de razas felinas</p>
        </div>

        <div className="relative grid place-items-center">
          <div
            ref={waveRef}
            aria-hidden="true"
            className="absolute size-56 rounded-full border-2 border-accent opacity-0"
          />
          <div
            aria-hidden="true"
            className="absolute size-80 animate-breathe rounded-full bg-[radial-gradient(circle,var(--accent-soft)_0%,transparent_65%)]"
          />
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
            // El botón de inicio es el logo hecho botón: disco de porcelana,
            // aro lavanda, el gato en pizarra y la acción debajo.
            className="group relative grid size-60 place-items-center rounded-full bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] shadow-[0_0_0_5px_var(--ring),inset_0_2px_0_oklch(100%_0_0/0.95),0_28px_50px_-28px_var(--ink)] outline-offset-8 transition-transform duration-300 ease-[var(--ease-cozy)] hover:scale-[1.04] active:scale-95 sm:size-64"
          >
            <span className="flex flex-col items-center gap-3">
              <CatMark ring={false} className="-mt-2 size-24 sm:size-28" />
              <span className="flex items-center gap-2 font-display text-lg leading-none font-semibold text-slate">
                <span className="grid size-7 place-items-center rounded-full bg-slate text-surface transition-transform duration-300 group-hover:scale-110">
                  <Play className="ml-px size-3.5 fill-current" aria-hidden="true" />
                </span>
                Empezar simulación
              </span>
            </span>
          </button>
        </div>

        <p id="gate-hint" data-gate-fade className="text-sm text-ink-soft">
          {total > 0 ? `${total} razas te esperan` : "Las razas te esperan"} · pulsa el orbe o Enter
        </p>
      </div>

      {/* Panel de carga: pasos reales, no una barra de adorno. */}
      <div
        data-gate-hud
        role="status"
        aria-live="polite"
        className={cn(
          "absolute inset-x-0 bottom-[12vh] flex flex-col items-center gap-4 opacity-0",
          !started && "invisible",
        )}
      >
        <p className="hud text-slate">Enlazando con el Michiverso</p>
        <div className="h-1.5 w-72 overflow-hidden rounded-full bg-ring/50">
          <div
            ref={barRef}
            className="h-full w-full origin-left scale-x-[0.04] rounded-full bg-gradient-to-r from-ring-strong to-accent"
          />
        </div>
        <ul className="flex flex-wrap justify-center gap-2">
          {steps.map((step) => (
            <li
              key={step.id}
              className={cn(
                "relative isolate flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-xs font-medium ring-[1.5px]",
                // El relleno de "listo" es una capa que se funde y crece un poco.
                "before:absolute before:inset-0 before:-z-10 before:scale-90 before:rounded-full before:bg-slate before:opacity-0 before:transition-[opacity,transform] before:duration-500 before:ease-[var(--ease-cozy)]",
                step.done
                  ? "text-surface ring-transparent before:scale-100 before:opacity-100"
                  : "bg-surface text-ink-soft ring-ring",
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
