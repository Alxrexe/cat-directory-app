import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

/**
 * Bloque de carga. El brillo es un pseudo-elemento que solo se traslada
 * (transform), así que corre en el compositor sin repintar el bloque.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-xl bg-ink/8",
        "after:absolute after:inset-0 after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-ink/[0.06] after:to-transparent",
        className,
      )}
      {...props}
    />
  );
}
