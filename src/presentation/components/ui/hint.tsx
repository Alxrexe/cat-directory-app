"use client";

import type { ReactElement } from "react";
import { useIdleModule } from "../../lib/idle";

const loadTooltip = () => import("./tooltip");

/** El botón ya lleva su aria-label: esto es la ayuda visual para ratón. */
export function Hint({ label, children }: { label: string; children: ReactElement }) {
  const tooltip = useIdleModule(loadTooltip);
  if (!tooltip) return children;
  const RadixHint = tooltip.default;
  return <RadixHint label={label}>{children}</RadixHint>;
}
