"use client";

import { useSyncExternalStore } from "react";
import { SYSTEM_DARK, THEME_STORAGE_KEY } from "./theme-script";

export type ColorTheme = "light" | "dark";

// El del sistema hasta que el visitante elige uno; la verdad es la clase de <html>.
const listeners = new Set<() => void>();

export function currentColorTheme(): ColorTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyColorTheme(next: ColorTheme) {
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Modo privado o almacenamiento bloqueado: el tema dura lo que la pestaña.
  }
  for (const listener of listeners) listener();
}

function storedTheme(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    document.documentElement.classList.toggle("dark", event.newValue === "dark");
    listener();
  };
  const system = window.matchMedia(SYSTEM_DARK);
  const onSystem = () => {
    if (storedTheme()) return;
    document.documentElement.classList.toggle("dark", system.matches);
    listener();
  };
  window.addEventListener("storage", onStorage);
  system.addEventListener("change", onSystem);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    system.removeEventListener("change", onSystem);
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
