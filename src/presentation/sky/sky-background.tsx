"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "../hooks/use-media-query";
import { cn } from "../lib/cn";
import { usePageSettled } from "../lib/idle";
import { useSimulationStore } from "../simulation/simulation-store";
import { useColorTheme, type ColorTheme } from "../theme/use-color-theme";
import { SKY } from "./sky-media";

// Clases literales: Tailwind solo genera las que ve escritas enteras.
const POSTER_CLASS: Record<ColorTheme, string> = {
  light: "bg-[url(/media/sky-day-poster.webp)]",
  dark: "bg-[url(/media/sky-night-poster.webp)]",
};

/**
 * Fondo del Michiverso a pantalla completa, sin márgenes: el cielo de día
 * con el tema claro y el cielo nocturno con el oscuro.
 *
 * - Cada cielo es una capa; cuál se ve lo decide el CSS (`dark:`), así que
 *   al cargar no hay parpadeo aunque React aún no sepa el tema.
 * - Un cielo no descarga nada hasta que su tema se usa por primera vez: con
 *   el tema claro, el nocturno no cuesta ni un byte.
 * - El póster (10 KB) llega justo después del primer pintado y el video
 *   llega encima con un fundido. El video se crea cuando la simulación lo
 *   pide y el cielo oculto se pausa.
 * - Nada del cielo se pide antes de que la página termine de cargar y el
 *   navegador quede ocioso: en una ficha abierta desde un enlace, póster y
 *   video (85 kB) competían con la foto por el primer pintado.
 * - Con movimiento reducido se queda el póster, sin video.
 */
export function SkyBackground() {
  const active = useSimulationStore((state) => state.skyActive);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const wide = useMediaQuery("(min-width: 1100px)", true);
  const { theme, known } = useColorTheme();
  const width = wide ? 1920 : 1280;
  const play = active && !reducedMotion;
  const settled = usePageSettled();

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--sky-fallback)]">
      <SkyLayer sky="light" enabled={settled && known && theme === "light"} width={width} play={play} className="dark:opacity-0" />
      <SkyLayer sky="dark" enabled={settled && known && theme === "dark"} width={width} play={play} className="opacity-0 dark:opacity-100" />
    </div>
  );
}

function SkyLayer({
  sky,
  enabled,
  width,
  play,
  className,
}: {
  sky: ColorTheme;
  enabled: boolean;
  width: number;
  play: boolean;
  className: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [used, setUsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [poster, setPoster] = useState(false);

  // Una vez usado, el cielo se queda montado (volver al tema es instantáneo).
  if (enabled && !used) setUsed(true);
  if (used && play && !mounted) setMounted(true);

  // El póster no compite con el primer pintado: se pide al hidratar y entra
  // con un fundido cuando ya está en caché. Hasta entonces, el color de fondo.
  useEffect(() => {
    if (!used) return;
    const image = new Image();
    image.onload = () => setPoster(true);
    image.src = SKY[sky].poster;
    return () => {
      image.onload = null;
    };
  }, [used, sky]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (play && enabled) void video.play().catch(() => {});
    else video.pause();
  }, [play, enabled, mounted]);

  return (
    <div className={cn("absolute inset-0 transition-opacity duration-700 ease-[var(--ease-soft)]", className)}>
      <div
        className={cn(
          "sky-poster absolute inset-0 bg-cover bg-center transition-opacity duration-[900ms] ease-[var(--ease-soft)]",
          poster ? cn(POSTER_CLASS[sky], "opacity-100") : "opacity-0",
        )}
      />
      {mounted && (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          autoPlay={enabled}
          preload="auto"
          disablePictureInPicture
          onPlaying={() => {
            setPlaying(true);
            useSimulationStore.getState().completeStep("sky");
          }}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-[var(--ease-soft)]",
            playing ? "opacity-100" : "opacity-0",
          )}
        >
          <source src={`${SKY[sky].video}-${width}.webm`} type="video/webm" />
          <source src={`${SKY[sky].video}-${width}.mp4`} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
