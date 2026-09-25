"use client";

import { Moon, Sun } from "lucide-react";
import { flushSync } from "react-dom";
import { Button } from "../components/ui/button";
import { Hint } from "../components/ui/hint";
import { useHydrated } from "../hooks/use-hydrated";
import { playCue } from "../lib/sound";
import { preloadSkyPoster } from "../sky/sky-media";
import { currentColorTheme, useColorTheme, type ColorTheme } from "../theme/use-color-theme";

/**
 * Interruptor de tema: botón redondo de consola con el sol o la luna.
 *
 * El icono lo elige el CSS (`dark:`), no React: llega bien pintado del
 * servidor aunque el tema aún no se conozca. El cambio va dentro de una
 * View Transition, que funde la página vieja con la nueva en el
 * compositor (solo opacidad); el campo de orbes, que vive en WebGL, funde
 * su paleta en el shader a la vez.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useColorTheme();
  const hydrated = useHydrated();
  const dark = hydrated && theme === "dark";
  const label = dark ? "Tema claro" : "Tema oscuro";

  const toggle = () => {
    const next: ColorTheme = currentColorTheme() === "dark" ? "light" : "dark";
    playCue("tick");
    const apply = () => {
      // La clase se pone también a mano: la transición fotografía el estado
      // nuevo en cuanto esta función vuelve, antes de los efectos de React.
      const root = document.documentElement;
      root.classList.toggle("dark", next === "dark");
      root.style.colorScheme = next;
      flushSync(() => setTheme(next));
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduced) {
      apply();
      return;
    }
    document.startViewTransition(apply);
  };

  return (
    <Hint label={label}>
      <Button
        variant="console"
        size="icon-lg"
        onClick={toggle}
        onPointerEnter={() => preloadSkyPoster(currentColorTheme() === "dark" ? "light" : "dark")}
        aria-label="Tema oscuro"
        aria-pressed={hydrated ? dark : undefined}
        className="max-sm:size-11"
      >
        <Moon className="size-5 dark:hidden" aria-hidden="true" />
        <Sun className="hidden size-5 dark:block" aria-hidden="true" />
      </Button>
    </Hint>
  );
}
