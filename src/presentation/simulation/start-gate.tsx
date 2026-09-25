"use client";

import { Check, LoaderCircle, Play } from "lucide-react";
import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";
import { CatMark } from "../brand/cat-mark";
import { Logo } from "../brand/logo";
import { Sparkle } from "../brand/sparkle";
import { loadFieldEngine } from "../field/load-engine";
import { cn } from "../lib/cn";
import { padIndex } from "../lib/format";
import { EASE, finished, play, playEach, prefersReducedMotion } from "../lib/motion";
import { loadSoundEngine, playCue } from "../lib/sound";
import { ConsoleClock } from "../top-bar/status";
import { useSimulationStore, type SimulationPhase } from "./simulation-store";

interface StartGateProps {
  phase: SimulationPhase;
  arriving: boolean;
  /** El canvas ya pinta el enlace debajo: el fondo liso puede irse. */
  tunnelVisible: boolean;
  total: number;
  onStart: () => void;
  /** Primer movimiento del puntero o foco en el botón: se prepara el motor. */
  onWarm: () => void;
  onLeft: () => void;
}

/**
 * Pantalla de inicio. El disco marca el progreso con un arco por paso real
 * de carga; al llegar, la retícula se atraviesa mientras el iris del canvas
 * se abre justo detrás, en el mismo centro.
 */
export function StartGate({ phase, arriving, tunnelVisible, total, onStart, onWarm, onLeft }: StartGateProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<HTMLDivElement>(null);
  const steps = useSimulationStore((state) => state.steps);
  const started = phase !== "gate";

  const done = steps.filter((step) => step.done).length;
  const percent = Math.round((done / steps.length) * 100);

  useEffect(() => {
    const background = rootRef.current?.querySelector("[data-gate-bg]");
    if (!tunnelVisible || !background) return;
    play(background, [{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: EASE.inOut, fill: "forwards" });
  }, [tunnelVisible]);

  const leave = useEffectEvent(() => onLeft());
  useEffect(() => {
    const root = rootRef.current;
    if (!arriving || !root) return;
    if (prefersReducedMotion()) {
      leave();
      return;
    }
    const out = { easing: EASE.in, fill: "forwards" } as const;
    const animations = [
      play(reticleRef.current, [{ transform: "none", opacity: 1 }, { transform: "scale(2.8)", opacity: 0 }], { ...out, duration: 1000 }),
      play(buttonRef.current, [{ transform: "none", opacity: 1 }, { transform: "scale(3.6)", opacity: 0 }], { ...out, duration: 850 }),
      play(root.querySelector("[data-gate-steps]"), [{ transform: "none", opacity: 1 }, { transform: "translateY(24px)", opacity: 0 }], { ...out, duration: 400 }),
      ...playEach(
        root.querySelectorAll("[data-gate-corner]"),
        (i) => [
          { transform: "none", opacity: 1 },
          { transform: `translate(${i % 2 === 0 ? -48 : 48}px, ${i < 2 ? -24 : 24}px)`, opacity: 0 },
        ],
        { ...out, duration: 600, delay: 50 },
      ),
      play(root.querySelector("[data-gate-grid]"), [{ opacity: 1 }, { opacity: 0 }], { ...out, duration: 700, delay: 100 }),
    ];
    void finished(animations).then(() => leave());
  }, [arriving]);

  const warmed = useRef(false);
  const warm = () => {
    if (warmed.current) return;
    warmed.current = true;
    void loadFieldEngine();
    // Con el sonido ya descargado, su AudioContext (lento de crear) nace en el
    // pointerdown y no en medio de las animaciones del clic.
    void loadSoundEngine().catch(() => {});
    onWarm();
  };

  // Un ref además de `started`: Enter y el clic pueden llegar en el mismo tick.
  const startedRef = useRef(false);
  const start = () => {
    if (started || startedRef.current) return;
    startedRef.current = true;
    playCue("arrival");
    void loadFieldEngine();
    onStart();
    if (prefersReducedMotion()) return;
    const sparks = burstRef.current?.children ?? [];
    play(buttonRef.current, [{ transform: "scale(0.92)" }, { transform: "none" }], { duration: 900, easing: EASE.elastic });
    play(waveRef.current, [{ transform: "scale(0.7)", opacity: 0.7 }, { transform: "scale(2.6)", opacity: 0 }], {
      duration: 1100,
      delay: 80,
      easing: EASE.out,
      fill: "both",
    });
    playEach(
      sparks,
      (i) => {
        const angle = (i / sparks.length) * Math.PI * 2 - Math.PI / 2;
        return [
          { transform: "translate(0, 0) scale(0)", opacity: 1 },
          { transform: `translate(${Math.cos(angle) * 190}px, ${Math.sin(angle) * 190}px) scale(1)`, opacity: 0 },
        ];
      },
      { duration: 900, delay: 100, stagger: 20, easing: EASE.expo, fill: "both" },
    );
    // Una vuelta extra encima del giro lento de CSS (van en elementos distintos).
    play(reticleRef.current, [{ transform: "scale(0.94)" }, { transform: "none" }], { duration: 1100, easing: EASE.elastic });
    play(spinRef.current, [{ transform: "rotate(0deg)" }, { transform: "rotate(140deg)" }], {
      duration: 1800,
      easing: EASE.inOut,
      fill: "forwards",
    });
  };

  // Enter empieza desde cualquier sitio, no solo con el foco en el botón.
  const startFromKeyboard = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Enter" || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    if ((event.target as HTMLElement | null)?.closest("input, textarea, [contenteditable='true']")) return;
    event.preventDefault();
    warm();
    start();
  });
  useEffect(() => {
    if (started) return;
    const listener = (event: KeyboardEvent) => startFromKeyboard(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [started]);

  const status = arriving ? "Listo" : started ? "Enlazando" : "En espera";

  return (
    <div
      ref={rootRef}
      onPointerMove={() => warm()}
      className={cn("fixed inset-0 z-30 overflow-hidden", started && "pointer-events-none")}
    >
      <div data-gate-bg aria-hidden="true" className="absolute inset-0 bg-[var(--gate)]" />
      <div data-gate-grid aria-hidden="true" className="absolute inset-0">
        <div className="hud-grid absolute inset-0" />
        <div className="absolute top-1/2 left-1/2 size-[min(120vmin,900px)] -translate-1/2 animate-breathe rounded-full bg-[radial-gradient(circle,var(--accent-soft)_0%,transparent_62%)]" />
      </div>

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

      {/* Centrada en la pantalla: el iris del canvas se abre en ese mismo punto. */}
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
        <div className="absolute inset-[17%] animate-[spin_14s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,var(--glint),var(--accent),var(--ring),var(--glint),var(--gel-hi),var(--glint))] opacity-80 [mask:radial-gradient(circle_closest-side,transparent_calc(100%-3px),black_calc(100%-2.5px),black_calc(100%-0.5px),transparent_100%)]" />
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

      <div className="absolute top-1/2 left-1/2 grid -translate-1/2 place-items-center">
        <div ref={waveRef} aria-hidden="true" className="absolute size-60 rounded-full border-2 border-accent opacity-0" />
        <div ref={burstRef} aria-hidden="true" className="absolute grid place-items-center">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="absolute opacity-0">
              <Sparkle className="size-4 animate-none text-glint" />
            </span>
          ))}
        </div>
        <div className="animate-[float_5s_var(--ease-soft)_infinite]">
        <button
          ref={buttonRef}
          type="button"
          autoFocus
          onClick={start}
          onFocus={() => warm()}
          disabled={started}
          aria-describedby="gate-hint"
          data-cue="primary"
          className="pearl-button select-frame group relative grid size-[min(60vmin,14rem)] place-items-center rounded-full outline-offset-8 transition-transform duration-300 ease-[var(--ease-cozy)] hover:scale-[1.03] sm:size-60"
        >
          <span className="flex flex-col items-center gap-3.5">
            <CatMark ring={false} className="-mt-2 size-[min(25vmin,6rem)] transition-transform duration-500 ease-[var(--ease-pop)] group-hover:scale-105 sm:size-28" />
            <span className="relative grid place-items-center">
              <span
                className={cn(
                  "gel-pill flex h-7 items-center gap-1.5 rounded-full pr-3 pl-1 font-display text-[0.68rem] leading-none font-semibold tracking-[0.01em] whitespace-nowrap transition-opacity duration-300 sm:h-8 sm:pr-3.5 sm:text-[0.72rem]",
                  started && "opacity-0",
                )}
              >
                <span className="grid size-5 place-items-center rounded-full bg-gel-ink text-gel sm:size-6">
                  <Play className="ml-px size-2.5 fill-current" aria-hidden="true" />
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
                <span className="lcd text-xl leading-none text-accent">{String(percent).padStart(3, "0")}%</span>
                <span className="hud text-[0.52rem] text-ink-soft">Enlazando</span>
              </span>
            </span>
          </span>
        </button>
        </div>
      </div>

      <p id="gate-hint" className="sr-only">
        {total > 0 ? `${total} razas te esperan.` : "Las razas te esperan."} Pulsa el orbe o Enter.
      </p>

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

/** 120 marcas en un solo path. */
const TICKS = Array.from({ length: 120 }, (_, i) => {
  const angle = (i / 120) * Math.PI * 2;
  const inner = i % 10 === 0 ? 176 : 186;
  const x1 = 200 + Math.cos(angle) * inner;
  const y1 = 200 + Math.sin(angle) * inner;
  const x2 = 200 + Math.cos(angle) * 196;
  const y2 = 200 + Math.sin(angle) * 196;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
}).join("");

function arc(i: number, n: number) {
  const gap = 0.08;
  const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + gap;
  const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - gap;
  const r = 190;
  const p = (a: number) => `${(200 + Math.cos(a) * r).toFixed(1)} ${(200 + Math.sin(a) * r).toFixed(1)}`;
  return `M${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}`;
}
