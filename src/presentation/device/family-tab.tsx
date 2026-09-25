"use client";

import useEmblaCarousel from "embla-carousel-react";
import { coatFamily } from "@domain/breed/coat";
import { FullImage } from "../components/full-image";
import { COAT_LABEL } from "../lib/format";
import { useIdleModule } from "../lib/idle";
import { breedMonogram, shortBreedName } from "../lib/monogram";
import type { DeviceScreenProps } from "./device-screen";

const loadBars = () => import("../features/breed-detail/coat-bars");

/** Emparentadas y reparto de pelajes. Chunk aparte. */
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
                <li key={item.slug} className="w-32 shrink-0" aria-roledescription="diapositiva">
                  {/* Tesela de canal: la foto completa de borde a borde, con el
                      nombre sobre un velo; al señalarla sube un poco. */}
                  <button
                    type="button"
                    onClick={() => onOpenRelated(item.slug)}
                    data-cue="breed"
                    className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl text-left shadow-[0_0_0_1px_oklch(100%_0_0/0.1),0_10px_18px_-12px_var(--shadow-deep)] transition-transform duration-300 ease-[var(--ease-cozy)] hover:-translate-y-1"
                  >
                    {photo ? (
                      <FullImage
                        src={photo.url}
                        alt=""
                        sizes="128px"
                        quality={60}
                        fallback={<MonogramTile name={item.name} />}
                      />
                    ) : (
                      <MonogramTile name={item.name} />
                    )}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,var(--glass-shine)_0%,transparent_30%),linear-gradient(0deg,var(--scrim)_0%,transparent_55%)]"
                    />
                    <span className="absolute inset-x-2 bottom-2 line-clamp-2 text-xs leading-tight font-semibold text-photo-ink">
                      {shortBreedName(item.name)}
                    </span>
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

function MonogramTile({ name }: { name: string }) {
  return (
    <span className="grid size-full place-items-center bg-screen-2 font-display text-2xl text-screen-soft">
      {breedMonogram(name)}
    </span>
  );
}
