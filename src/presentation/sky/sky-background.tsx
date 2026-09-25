"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "../hooks/use-media-query";
import { cn } from "../lib/cn";
import { useSimulationStore } from "../simulation/simulation-store";

/**
 * Fondo del Michiverso: el cielo de día (Blue sky) a pantalla completa, sin
 * márgenes. El Michiverso vive siempre en tema claro.
 *
 * - El póster (10 KB) pinta el cielo desde el primer frame y el video
 *   (WebM VP9 de ~130 KB o MP4 de respaldo) llega encima con un fundido.
 *   El original 4K pesaba 80 MB: ver `public/media`.
 * - El video se crea cuando la simulación lo pide (no antes).
 * - Con movimiento reducido se queda el póster, sin video.
 */
export function SkyBackground() {
  const active = useSimulationStore((state) => state.skyActive);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const wide = useMediaQuery("(min-width: 1100px)", true);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--sky-fallback)]">
      <SkyLayer width={wide ? 1920 : 1280} play={active && !reducedMotion} />
    </div>
  );
}

function SkyLayer({ width, play }: { width: number; play: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(false);

  // El video se crea la primera vez que hace falta y después solo se pausa.
  if (play && !mounted) setMounted(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (play) void video.play().catch(() => {});
    else video.pause();
  }, [play, mounted]);

  return (
    <div className="absolute inset-0">
      <div className="sky-poster absolute inset-0 bg-[url(/media/sky-day-poster.webp)] bg-cover bg-center" />
      {mounted && (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          autoPlay
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
          <source src={`/media/sky-day-${width}.webm`} type="video/webm" />
          <source src={`/media/sky-day-${width}.mp4`} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
