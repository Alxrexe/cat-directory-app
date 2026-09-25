"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Controles físicos del Ronrón. Cada uno es un <button> real con nombre
 * accesible; el "hundimiento" al pulsar es un translateY de 2 px.
 */
const press =
  "transition-transform duration-150 ease-[var(--ease-cozy)] active:translate-y-0.5 disabled:opacity-35 disabled:active:translate-y-0";

export function DPad({
  onLeft,
  onRight,
  onUp,
  onDown,
  leftLabel,
  rightLabel,
  canLeft,
  canRight,
}: {
  onLeft: () => void;
  onRight: () => void;
  onUp: () => void;
  onDown: () => void;
  leftLabel: string;
  rightLabel: string;
  canLeft: boolean;
  canRight: boolean;
}) {
  // Cruceta de pizarra anodizada: un solo bloque de luz (arriba) y sombra
  // (abajo) repartido en brazos, con un hoyuelo en el centro.
  const arm =
    "grid place-items-center bg-[linear-gradient(180deg,var(--anod-hi),var(--anod))] text-surface/85 hover:text-surface [&_svg]:size-5 shadow-[inset_0_1px_0_var(--anod-shine),inset_0_-2px_0_var(--anod-lo)]";
  return (
    <div
      role="group"
      aria-label="Cruceta"
      className="grid size-[7.5rem] shrink-0 grid-cols-3 grid-rows-3 drop-shadow-[0_8px_10px_var(--shadow-soft)] sm:size-32 lg:size-28 xl:size-32"
    >
      <button type="button" aria-label="Pestaña anterior" onClick={onUp} className={cn(arm, press, "col-start-2 rounded-t-xl")}>
        <ChevronUp aria-hidden="true" />
      </button>
      <button type="button" aria-label={leftLabel} onClick={onLeft} disabled={!canLeft} className={cn(arm, press, "row-start-2 rounded-l-xl")}>
        <ChevronLeft aria-hidden="true" />
      </button>
      <span
        aria-hidden="true"
        className="col-start-2 row-start-2 bg-[radial-gradient(circle,var(--anod-lo)_0%,var(--anod)_62%)]"
      />
      <button type="button" aria-label={rightLabel} onClick={onRight} disabled={!canRight} className={cn(arm, press, "col-start-3 row-start-2 rounded-r-xl")}>
        <ChevronRight aria-hidden="true" />
      </button>
      <button type="button" aria-label="Pestaña siguiente" onClick={onDown} className={cn(arm, press, "col-start-2 row-start-3 rounded-b-xl")}>
        <ChevronDown aria-hidden="true" />
      </button>
    </div>
  );
}

export function RoundButton({
  letter,
  caption,
  tone,
  className,
  ...props
}: ComponentProps<"button"> & { letter: string; caption: string; tone: "a" | "b" }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        className={cn(
          "grid size-14 place-items-center rounded-full font-display text-xl font-semibold sm:size-16",
          // A es la acción principal (pizarra anodizada); B, aluminio torneado.
          tone === "a" ? "anodized" : "console-dot text-slate",
          press,
          className,
        )}
        {...props}
      >
        <span aria-hidden="true">{letter}</span>
      </button>
      <span aria-hidden="true" className="hud text-[0.56rem] whitespace-nowrap text-ink-soft">
        {caption}
      </span>
    </div>
  );
}

export function PillButton({ children, className, ...props }: ComponentProps<"button"> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        "hud porcelain h-8 rounded-full px-3.5 text-[0.58rem] whitespace-nowrap text-slate hover:-translate-y-px",
        press,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ShoulderButton({ letter, className, ...props }: ComponentProps<"button"> & { letter: string }) {
  return (
    <button
      type="button"
      className={cn(
        "metal-shell h-8 w-20 rounded-t-2xl rounded-b-md font-display text-sm font-semibold text-slate",
        press,
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">{letter}</span>
    </button>
  );
}

/** Rejilla de altavoz y LED de encendido: pura decoración. */
export function Speaker() {
  return (
    <div aria-hidden="true" className="grid grid-cols-4 gap-1.5">
      {Array.from({ length: 12 }, (_, i) => (
        // Perforaciones en el metal: agujeros con sombra interior.
        <span key={i} className="size-1.5 rounded-full bg-alu-lo shadow-[inset_0_1px_1px_var(--anod)]" />
      ))}
    </div>
  );
}

export function PowerLed() {
  return (
    <span aria-hidden="true" className="flex items-center gap-1.5">
      <span className="size-2 animate-breathe rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
      <span className="hud text-[0.56rem] text-ink-soft">On</span>
    </span>
  );
}
