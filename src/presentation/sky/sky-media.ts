import type { ColorTheme } from "../theme/use-color-theme";

// Recodificados de originales 4K de 80 MB: 10 s en bucle, VP9 (~130 KB) y H.264 de respaldo.
export const SKY = {
  light: { poster: "/media/sky-day-poster.webp", video: "/media/sky-day" },
  dark: { poster: "/media/sky-night-poster.webp", video: "/media/sky-night" },
} as const satisfies Record<ColorTheme, { poster: string; video: string }>;

const posters = new Map<ColorTheme, Promise<void>>();

/** La promesa se comparte: pedirlo dos veces no descarga dos. */
export function preloadSkyPoster(theme: ColorTheme): Promise<void> {
  let pending = posters.get(theme);
  if (!pending) {
    const image = new Image();
    image.src = SKY[theme].poster;
    pending = image.decode().catch(() => {});
    posters.set(theme, pending);
  }
  return pending;
}
