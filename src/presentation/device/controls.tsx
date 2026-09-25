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
  // Cruceta de plástico perla, del mismo color que la carcasa y un punto
  // más honda (como la de una consola de bolsillo blanca). Un solo bloque de
  // luz arriba y sombra abajo repartido en los brazos, y un hoyuelo central.
  const arm =
    "grid place-items-center bg-[linear-gradient(180deg,var(--surface-2),var(--surface-3))] text-slate/75 hover:text-slate [&_svg]:size-5 shadow-[inset_0_1px_0_var(--sheen),inset_0_-2.5px_0_var(--shade)]";
  return (
    <div
      role="group"
      aria-label="Cruceta"
      className="grid size-[7rem] shrink-0 grid-cols-3 grid-rows-3 drop-shadow-[0_0_1px_var(--shadow-deep)] drop-shadow-[0_6px_8px_var(--shadow-soft)] sm:size-28 lg:size-26 xl:size-28"
    >
      <button type="button" aria-label="Pestaña anterior" onClick={onUp} className={cn(arm, press, "col-start-2 rounded-t-[14px]")}>
        <ChevronUp aria-hidden="true" />
      </button>
      <button type="button" aria-label={leftLabel} onClick={onLeft} disabled={!canLeft} className={cn(arm, press, "row-start-2 rounded-l-[14px]")}>
        <ChevronLeft aria-hidden="true" />
      </button>
      <span
        aria-hidden="true"
        className="col-start-2 row-start-2 bg-[radial-gradient(circle,var(--shade)_0%,var(--surface-3)_62%)]"
      />
      <button type="button" aria-label={rightLabel} onClick={onRight} disabled={!canRight} className={cn(arm, press, "col-start-3 row-start-2 rounded-r-[14px]")}>
        <ChevronRight aria-hidden="true" />
      </button>
      <button type="button" aria-label="Pestaña siguiente" onClick={onDown} className={cn(arm, press, "col-start-2 row-start-3 rounded-b-[14px]")}>
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
          "select-frame grid size-14 place-items-center rounded-full font-display text-xl font-bold sm:size-15",
          // A es la acción principal (gel azul); B, perla.
          tone === "a" ? "gel" : "pearl-button text-slate",
          press,
          className,
        )}
        {...props}
      >
        <span aria-hidden="true">{letter}</span>
      </button>
      <span aria-hidden="true" className="hud text-[0.54rem] whitespace-nowrap text-ink-soft">
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
        "hud pearl select-frame h-8 rounded-full px-3.5 text-[0.56rem] whitespace-nowrap text-slate hover:-translate-y-px",
        press,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Gatillo L/R: una pieza aparte que flota sobre la carcasa (como las
 * orejas), no pegada a ella.
 */
export function ShoulderButton({ letter, className, ...props }: ComponentProps<"button"> & { letter: string }) {
  return (
    <button
      type="button"
      className={cn(
        "pearl-button select-frame h-8 w-20 rounded-full font-display text-sm font-bold text-slate",
        press,
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">{letter}</span>
    </button>
  );
}

/**
 * Rejilla de altavoz: 4 × 3 perforaciones en el plástico, pintadas con un
 * degradado radial que se repite (un solo elemento, no doce).
 */
export function Speaker() {
  return (
    <span
      aria-hidden="true"
      className="block h-[30px] w-[42px] bg-[radial-gradient(circle,var(--shadow-soft)_0_2.4px,transparent_3px)] bg-[length:12px_12px] bg-[position:-3px_-3px]"
    />
  );
}

export function PowerLed() {
  return (
    <span aria-hidden="true" className="flex items-center gap-1.5">
      <span className="size-2 animate-breathe rounded-full bg-accent shadow-[0_0_10px_var(--glint)]" />
      <span className="hud text-[0.54rem] text-ink-soft">On</span>
    </span>
  );
}
