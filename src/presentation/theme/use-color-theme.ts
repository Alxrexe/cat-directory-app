"use client";

import { useTheme } from "next-themes";

export type ColorTheme = "light" | "dark";

/**
 * Tema de color del Michiverso: claro por defecto, oscuro si el visitante
 * lo elige (se recuerda en localStorage; el sistema operativo no decide).
 *
 * next-themes pone la clase `.dark` en <html> antes del primer pintado, así
 * que el CSS nunca parpadea. En el servidor y durante la hidratación el tema
 * aún no se conoce: aquí vale "light" y quien pinte algo distinto por tema
 * debe hacerlo con CSS (`dark:`), no con esta lectura.
 */
export function useColorTheme() {
  const { resolvedTheme, setTheme } = useTheme();
  const theme: ColorTheme = resolvedTheme === "dark" ? "dark" : "light";
  return { theme, known: resolvedTheme !== undefined, setTheme: (next: ColorTheme) => setTheme(next) };
}

/** Lectura directa del DOM, para código que corre fuera de React. */
export function currentColorTheme(): ColorTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
