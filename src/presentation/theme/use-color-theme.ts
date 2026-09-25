"use client";

import { useSyncExternalStore } from "react";

export type ColorTheme = "light" | "dark";

// Cada visita empieza en claro; el botón cambia el tema solo durante la visita.
const listeners = new Set<() => void>();

export function currentColorTheme(): ColorTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyColorTheme(next: ColorTheme) {
  document.documentElement.classList.toggle("dark", next === "dark");
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Vale "light" hasta hidratar: lo visual va por CSS (`dark:`), esto es para efectos. */
export function useColorTheme() {
  const theme = useSyncExternalStore<ColorTheme>(subscribe, currentColorTheme, () => "light");
  const known = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return { theme, known };
}

const noopSubscribe = () => () => {};
