"use client";

import { useState } from "react";
import { useIdleModule } from "../../lib/idle";
import { ThemeTriggerButton } from "./theme-trigger";

const loadDropdown = () => import("./theme-menu-dropdown");

/**
 * Selector de tema. El menú de Radix llega en ocioso; si alguien pulsa antes,
 * se pide en ese momento y se abre ya desplegado. El botón es idéntico en
 * los dos estados, así que no hay salto visual.
 */
export function ThemeMenu() {
  const [requested, setRequested] = useState(false);
  const dropdown = useIdleModule(loadDropdown, { now: requested });

  if (dropdown) {
    const ThemeDropdown = dropdown.default;
    return <ThemeDropdown defaultOpen={requested} />;
  }
  return <ThemeTriggerButton aria-haspopup="menu" onClick={() => setRequested(true)} />;
}
