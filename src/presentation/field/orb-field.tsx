"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { FieldBreed, FieldEngine, OrbTarget } from "./engine/engine";
import { loadFieldEngine, resolveAtlasFonts } from "./load-engine";
import { readyGsap } from "../lib/gsap";

interface OrbFieldProps {
  breeds: FieldBreed[];
  /** Capacidad del atlas: total de razas del directorio. */
  capacity: number;
  matchMask: Uint8Array | null;
  spotlight: string | null;
  dimmed: boolean;
  reducedMotion: boolean;
  onReady: (engine: FieldEngine) => void;
  onPick: (target: OrbTarget) => void;
  onExplore: () => void;
  onFailed: () => void;
  /** Orbe señalado (para precargar su ficha). */
  onHoverChange?: (slug: string | null) => void;
  /** Toque en el cielo (fuera de la consola). */
  onPress?: () => void;
}

/**
 * Puente entre React y el motor del campo. El motor vive fuera de React: se
 * crea una vez y recibe los cambios (razas, búsqueda, tema) por su API, sin
 * re-render del canvas. La etiqueta del orbe señalado se mueve escribiendo
 * `transform` en cada frame, nunca con estado de React.
 */
export function OrbField(props: OrbFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<FieldEngine | null>(null);
  const [hovered, setHovered] = useState<OrbTarget | null>(null);

  const events = useEffectEvent((kind: "pick" | "explore" | "ready" | "failed", payload?: unknown) => {
    if (kind === "pick") props.onPick(payload as OrbTarget);
    else if (kind === "explore") props.onExplore();
    else if (kind === "ready") props.onReady(payload as FieldEngine);
    else props.onFailed();
  });

  const initial = useEffectEvent(() => ({
    reducedMotion: props.reducedMotion,
    capacity: props.capacity,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let created: FieldEngine | null = null;
    const { reducedMotion, capacity } = initial();

    void Promise.all([loadFieldEngine(), resolveAtlasFonts()])
      .then(([module, fonts]) => {
        if (disposed) return;
        try {
          created = module.createFieldEngine({
            canvas,
            reducedMotion,
            fonts,
            capacity: Math.max(capacity, 100),
            onHover: (target) => setHovered(target),
            onHoverMove: (x, y, size) => {
              const label = labelRef.current;
              if (label) label.style.transform = `translate3d(${x}px, ${y - size * 0.72}px, 0) translate(-50%, -100%)`;
            },
            onPick: (target) => events("pick", target),
            onExplore: () => events("explore"),
          });
        } catch {
          events("failed"); // sin WebGL: la consola sigue funcionando sola
          return;
        }
        setEngine(created);
        events("ready", created);
      })
      .catch(() => events("failed"));

    return () => {
      disposed = true;
      created?.dispose();
    };
  }, []);

  useEffect(() => {
    engine?.setBreeds(props.breeds);
  }, [engine, props.breeds]);
  useEffect(() => {
    engine?.setMatches(props.matchMask);
  }, [engine, props.matchMask]);
  useEffect(() => {
    engine?.setSpotlight(props.spotlight);
  }, [engine, props.spotlight]);
  useEffect(() => {
    engine?.setDimmed(props.dimmed);
  }, [engine, props.dimmed]);

  const hoverChanged = useEffectEvent((slug: string | null) => props.onHoverChange?.(slug));
  useEffect(() => {
    hoverChanged(hovered?.slug ?? null);
  }, [hovered?.slug]);

  // Entrada/salida suave de la etiqueta.
  useEffect(() => {
    const label = labelRef.current;
    if (!label) return;
    readyGsap()?.to(label.firstElementChild, {
      opacity: hovered ? 1 : 0,
      scale: hovered ? 1 : 0.9,
      y: hovered ? 0 : 6,
      duration: 0.28,
      ease: "power3.out",
    });
  }, [hovered]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        onPointerDown={() => props.onPress?.()}
        className="fixed inset-0 z-10 block h-dvh w-screen touch-none select-none"
      />
      <div ref={labelRef} aria-hidden="true" className="pointer-events-none fixed top-0 left-0 z-20 will-change-transform">
        <div className="porcelain flex origin-bottom flex-col items-center rounded-2xl px-4 py-2 opacity-0">
          <span className="font-display text-lg leading-tight text-ink">{hovered?.name}</span>
          <span className="text-xs font-semibold text-ink-soft">{hovered?.country ?? "País sin registrar"} · clic para abrir</span>
        </div>
      </div>
    </>
  );
}
