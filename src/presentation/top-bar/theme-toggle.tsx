"use client";

import { Moon, Sun } from "lucide-react";
import { useRef, type MouseEvent } from "react";
import { Button } from "../components/ui/button";
import { Hint } from "../components/ui/hint";
import { useHydrated } from "../hooks/use-hydrated";
import { playCue } from "../lib/sound";
import { preloadSkyPoster } from "../sky/sky-media";
import { switchColorTheme } from "../theme/theme-transition";
import { currentColorTheme, useColorTheme, type ColorTheme } from "../theme/use-color-theme";

/** El icono lo elige el CSS: llega bien pintado aunque el tema aún no se sepa. */
export function ThemeToggle() {
  const { theme } = useColorTheme();
  const hydrated = useHydrated();
  const busy = useRef(false);
  const dark = hydrated && theme === "dark";
  const label = dark ? "Tema claro" : "Tema oscuro";

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    if (busy.current) return;
    busy.current = true;
    const next: ColorTheme = currentColorTheme() === "dark" ? "light" : "dark";
    const rect = event.currentTarget.getBoundingClientRect();
    playCue("bloom");
    void switchColorTheme(
      next,
      { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      { beforeReveal: preloadSkyPoster(next) },
    ).finally(() => {
      busy.current = false;
    });
  };

  return (
    <Hint label={label}>
      <Button
        variant="console"
        size="icon-lg"
        onClick={toggle}
        onPointerEnter={() => void preloadSkyPoster(currentColorTheme() === "dark" ? "light" : "dark")}
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
