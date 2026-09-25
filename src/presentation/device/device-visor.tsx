"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { BreedPhoto } from "@domain/breed/profile";
import { padIndex } from "../lib/format";
import { breedMonogram } from "../lib/monogram";
import { readyGsap } from "../lib/gsap";

interface DeviceVisorProps {
  name: string;
  photo: BreedPhoto | null;
  sourceUrl: string | null;
  position: number;
  total: number;
  isNew: boolean;
  priority: boolean;
}

/**
 * El visor: la foto de la raza entera, sin recortes, dentro de un marco
 * de "canal" de consola (rectángulo redondeado con aro lavanda). Las fotos
 * de Wikimedia tienen proporciones distintas: se muestran completas
 * (`object-contain`) sobre un fondo neutro, nunca estiradas ni cortadas.
 * Cuando la foto llega, una línea de luz la recorre y la imagen se asienta
 * (escala + opacidad, nada más).
 */
export function DeviceVisor({ name, photo, sourceUrl, position, total, isNew, priority }: DeviceVisorProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    const gsap = readyGsap();
    if (!gsap || !frame || !loaded || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const image = frame.querySelector("img");
    const scan = frame.querySelector("[data-scan]");
    const tl = gsap.timeline();
    tl.fromTo(image, { scale: 1.14, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.1, ease: "power3.out" }).fromTo(
      scan,
      { yPercent: -120, opacity: 1 },
      { yPercent: 520, opacity: 0.2, duration: 1.2, ease: "power2.inOut" },
      0,
    );
    return () => {
      tl.kill();
    };
  }, [loaded]);

  return (
    <figure className="relative rounded-[30px] bg-surface p-2 shadow-[0_0_0_2px_var(--ring),inset_0_1.5px_0_oklch(100%_0_0/0.9)]">
      {/* En escritorio el visor cede altura para que el Ronrón quepa sin scroll. */}
      <div className="relative mx-auto aspect-[4/3.4] w-full max-w-[30rem] lg:max-h-[calc(100dvh-24rem)]">
        <div
          ref={frameRef}
          className="absolute inset-0 overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_50%_40%,var(--surface),var(--surface-3))]"
        >
          {photo ? (
            <Image
              src={photo.url}
              alt={`Foto de un gato de raza ${name}`}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 480px, (min-width: 640px) 60vw, 86vw"
              quality={60}
              className="object-contain"
              onLoad={() => setLoaded(true)}
            />
          ) : (
            <div className="grid size-full place-items-center">
              <span className="font-display text-[clamp(3rem,10vw,6rem)] font-semibold text-ring-strong">
                {breedMonogram(name)}
              </span>
            </div>
          )}
          <div
            data-scan
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-1/5 bg-gradient-to-b from-transparent via-[var(--accent-soft)] to-transparent opacity-0"
          />
          {/* Filete interior: el borde de la pantalla del canal. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[24px] shadow-[inset_0_0_0_1.5px_var(--ring)]" />
        </div>

        <span className="hud absolute top-3 left-3 rounded-full bg-surface/90 px-2.5 py-1.5 text-slate shadow-[0_0_0_1.5px_var(--ring)]">
          N.º {padIndex(position)}/{padIndex(total)}
        </span>
        {isNew && (
          <span className="hud absolute top-3 right-3 rounded-full bg-slate px-2.5 py-1.5 text-surface">Nueva</span>
        )}
      </div>

      <figcaption className="hud flex items-center justify-center gap-2 pt-2 pb-0.5 text-center text-[0.58rem] text-ink-soft">
        {photo ? (
          <>
            Foto:
            <a
              href={sourceUrl ?? "https://commons.wikimedia.org"}
              target="_blank"
              rel="noreferrer"
              className="text-slate underline decoration-ring decoration-[1.5px] underline-offset-2 hover:decoration-accent"
            >
              Wikimedia Commons
            </a>
          </>
        ) : (
          "Sin foto en el archivo"
        )}
      </figcaption>
    </figure>
  );
}
