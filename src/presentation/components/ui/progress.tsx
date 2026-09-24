"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

/** Barra de 1px, a juego con los filetes. Escala en X en vez de cambiar el ancho. */
export function Progress({ className, value, max = 100, ...props }: ComponentProps<typeof ProgressPrimitive.Root>) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, (value ?? 0) / max)) : 0;
  return (
    <ProgressPrimitive.Root
      value={value}
      max={max}
      className={cn("relative h-px w-full overflow-hidden bg-border", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full origin-left bg-primary transition-transform duration-500 ease-out"
        style={{ transform: `scaleX(${ratio})` }}
      />
    </ProgressPrimitive.Root>
  );
}
