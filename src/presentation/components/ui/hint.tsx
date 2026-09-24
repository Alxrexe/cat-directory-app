"use client";

import type { ReactElement } from "react";
import { useIdleModule } from "../../lib/idle";

const loadTooltip = () => import("./tooltip");

/**
 * Etiqueta visual para botones de solo icono. El botón ya lleva su
 * `aria-label`; esto es la ayuda para quien usa ratón. Mientras el tooltip
 * de Radix no ha llegado, el botón se pinta igual, sin él.
 */
export function Hint({ label, children }: { label: string; children: ReactElement }) {
  const tooltip = useIdleModule(loadTooltip);
  if (!tooltip) return children;
  const RadixHint = tooltip.default;
  return <RadixHint label={label}>{children}</RadixHint>;
}
