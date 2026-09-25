"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "./theme-script";

export type ColorTheme = "light" | "dark";

/**
 * Tema de color del Michiverso: claro por defecto, oscuro si el visitante
 * lo elige. La fuente de verdad es la clase `.dark` de <html> (la pone
 * `THEME_SCRIPT` antes del primer pintado) y la elección se guarda en
 * localStorage. El sistema operativo no decide.
 *
 * Un store mínimo en lugar de una librería: el tema es un booleano, y así
 * no hay ningún <script> dentro de componentes de cliente.
 */
const listeners = new Set<() => void>();

export function currentColorTheme(): ColorTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Cambia el tema al instante (las transiciones las orquesta quien llama). */
export function applyColorTheme(next: ColorTheme) {
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Modo privado o almacenamiento bloqueado: el tema dura lo que la pestaña.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Otra pestaña cambió el tema: esta lo sigue.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    document.documentElement.classList.toggle("dark", event.newValue === "dark");
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * En el servidor y durante la hidratación vale "light" (`known: false`):
 * lo que se pinte distinto por tema debe hacerlo con CSS (`dark:`), y esta
 * lectura sirve para efectos (motor WebGL, cielo, avisos).
 */
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
