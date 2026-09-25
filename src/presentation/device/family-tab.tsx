"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { coatFamily } from "@domain/breed/coat";
import { OrbShape } from "../brand/orb-shape";
import { COAT_LABEL } from "../lib/format";
import { useIdleModule } from "../lib/idle";
import { breedMonogram, shortBreedName } from "../lib/monogram";
import type { DeviceScreenProps } from "./device-screen";

const loadBars = () => import("../features/breed-detail/coat-bars");

/**
 * Pestaña Familia del Ronrón: razas emparentadas (carrusel arrastrable) y
 * el reparto de pelajes del Michiverso. Se carga aparte (ver device-screen).
 */
export default function FamilyTab({ breed, related, relatedPhotos, coats, total, tab, onOpenRelated }: DeviceScreenProps) {
  const [viewportRef] = useEmblaCarousel({ align: "start", dragFree: true, containScroll: "trimSnaps" });
  const bars = useIdleModule(loadBars, { now: tab === "familia", idle: false });
  const CoatBars = bars?.default;
  const family = coatFamily(breed.coat);

  return (
    <div className="space-y-5">
      {related.length > 0 ? (
        <div ref={viewportRef} className="-mx-1 overflow-hidden px-1" aria-roledescription="carrusel" aria-label="Razas emparentadas">
          <ul className="flex gap-3">
            {related.map((item) => {
              const photo = relatedPhotos[item.slug];
              return (
                <li key={item.slug} className="w-24 shrink-0" aria-roledescription="diapositiva">
                  <button
                    type="button"
                    onClick={() => onOpenRelated(item.slug)}
                    data-cue="breed"
                    className="group flex w-full flex-col items-center gap-1.5 text-center"
                  >
                    <span className="relative size-20 transition-transform duration-300 ease-[var(--ease-cozy)] group-hover:-translate-y-1">
                      <OrbShape className="absolute inset-0 size-full" fill="var(--ring)" />
                      <span className="absolute inset-[7%] overflow-hidden rounded-full">
                        {photo ? (
                          <Image src={photo.url} alt="" fill sizes="80px" className="object-cover" />
                        ) : (
                          <span className="grid size-full place-items-center bg-slate font-display text-lg text-screen-ink">
                            {breedMonogram(item.name)}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="line-clamp-2 text-xs leading-tight font-semibold text-screen-ink">{shortBreedName(item.name)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-screen-soft">Ninguna raza comparte país ni pelaje con esta.</p>
      )}

      <figure>
        <figcaption className="hud mb-2 text-screen-soft">Pelaje en el Michiverso</figcaption>
        <div className="h-44" aria-hidden="true">
          {CoatBars && (
            <CoatBars
              data={coats.map((share) => ({
                family: share.family,
                label: COAT_LABEL[share.family],
                count: share.count,
                current: share.family === family,
              }))}
            />
          )}
        </div>
        <table className="sr-only">
          <caption>Razas por familia de pelaje, de {total}</caption>
          <tbody>
            {coats.map((share) => (
              <tr key={share.family}>
                <th scope="row">
                  {COAT_LABEL[share.family]}
                  {share.family === family ? " (esta raza)" : ""}
                </th>
                <td>{share.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </div>
  );
}
