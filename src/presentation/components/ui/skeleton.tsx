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
        "relative overflow-hidden bg-muted",
        "after:absolute after:inset-0 after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-foreground/[0.05] after:to-transparent",
        className,
      )}
      {...props}
    />
  );
}
