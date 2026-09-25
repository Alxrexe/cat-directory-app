"use client";

import { useEffect, useRef, useState } from "react";
import type { BreedPhoto } from "@domain/breed/profile";
import { FullImage } from "../components/full-image";
import { padIndex } from "../lib/format";
import { breedMonogram } from "../lib/monogram";
import { EASE, motionArmed, play } from "../lib/motion";

interface DeviceVisorProps {
  name: string;
  photo: BreedPhoto | null;
  sourceUrl: string | null;
  position: number;
  total: number;
  isNew: boolean;
  priority: boolean;
}

export function DeviceVisor({ name, photo, sourceUrl, position, total, isNew, priority }: DeviceVisorProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !loaded || !motionArmed()) return;
    const settle = play(frame.querySelector("[data-photo]"), [{ transform: "scale(1.14)", opacity: 0 }, { transform: "none", opacity: 1 }], {
      duration: 1100,
      easing: EASE.out,
    });
    const scan = play(frame.querySelector("[data-scan]"), [{ transform: "translateY(-120%)", opacity: 1 }, { transform: "translateY(520%)", opacity: 0.2 }], {
      duration: 1200,
      easing: EASE.inOut,
    });
    return () => {
      settle?.cancel();
      scan?.cancel();
    };
  }, [loaded]);

  return (
    <figure className="relative">
      {/* En escritorio cede altura para que el Ronrón quepa en 1280×800 sin scroll. */}
      <div
        ref={frameRef}
        data-screen
        className="squircle relative aspect-[4/3.3] w-full overflow-hidden rounded-[28px] bg-surface-3 shadow-[0_0_0_1px_var(--hairline),0_18px_36px_-22px_var(--shadow-deep)] lg:max-h-[max(14rem,calc(100dvh-29rem))]"
      >
        {photo ? (
          <FullImage
            src={photo.url}
            alt={`Foto de un gato de raza ${name}`}
            priority={priority}
            sizes="(min-width: 1024px) 480px, (min-width: 640px) 60vw, 84vw"
            quality={60}
            onLoad={() => setLoaded(true)}
            fallback={<MonogramPlate name={name} />}
          />
        ) : (
          <MonogramPlate name={name} />
        )}
        <div
          data-scan
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1/5 bg-gradient-to-b from-transparent via-[var(--accent-soft)] to-transparent opacity-0"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,var(--glass-shine)_0%,transparent_32%),linear-gradient(0deg,var(--scrim)_0%,transparent_26%)]"
        />

        <span className="pearl absolute top-3 left-3 flex items-baseline gap-1.5 rounded-full px-3 py-1.5 text-slate">
          <span className="hud text-[0.54rem]">N.º</span>
          <span className="lcd text-[0.95rem] leading-none">
            {padIndex(position)}/{padIndex(total)}
          </span>
        </span>
        {isNew && <span className="hud gel absolute top-3 right-3 rounded-full px-3 py-1.5 text-[0.56rem]">Nueva</span>}

        <figcaption className="hud absolute bottom-3 left-4 text-[0.56rem] text-photo-ink">
          {photo ? (
            <>
              Foto:{" "}
              <a
                href={sourceUrl ?? "https://commons.wikimedia.org"}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-photo-ink/60 decoration-[1.5px] underline-offset-2 hover:decoration-photo-ink"
              >
                Wikimedia Commons
              </a>
            </>
          ) : (
            <span className="text-ink-soft">Sin foto en el archivo</span>
          )}
        </figcaption>
      </div>
    </figure>
  );
}

function MonogramPlate({ name }: { name: string }) {
  return (
    <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_50%_40%,var(--surface),var(--surface-3))]">
      <span className="font-display text-[clamp(3rem,10vw,6rem)] font-semibold text-ring-strong">
        {breedMonogram(name)}
      </span>
    </div>
  );
}
