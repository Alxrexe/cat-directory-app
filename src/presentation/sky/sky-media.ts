import type { ColorTheme } from "../theme/use-color-theme";

/**
 * Cielos del Michiverso: de día "Blue sky", de noche "Night sky". Los
 * originales 4K (80 MB cada uno) se recodificaron a 10 s en bucle: WebM VP9
 * de ~130 KB y MP4 H.264 de respaldo, en 1920 y 1280 px, más un póster WebP
 * de 10 KB. Ver `public/media`.
 */
export const SKY = {
  light: { poster: "/media/sky-day-poster.webp", video: "/media/sky-day" },
  dark: { poster: "/media/sky-night-poster.webp", video: "/media/sky-night" },
} as const satisfies Record<ColorTheme, { poster: string; video: string }>;

/** Adelanta el póster de un cielo (al acercar el puntero al botón de tema). */
export function preloadSkyPoster(theme: ColorTheme) {
  const image = new Image();
  image.src = SKY[theme].poster;
}
