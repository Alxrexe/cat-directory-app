"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/ui/button";

export interface RelatedBreedCard {
  slug: string;
  name: string;
  country: string | null;
  reason: string;
}

/**
 * Carrusel de razas emparentadas (embla). Se arrastra en táctil y con
 * trackpad; los botones y el teclado hacen lo mismo. Embla sigue el foco,
 * así que tabular hasta una tarjeta fuera de cuadro la trae a la vista.
 */
export function RelatedBreeds({ breeds }: { breeds: readonly RelatedBreedCard[] }) {
  const [viewportRef, api] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps", dragFree: true });
  const [edges, setEdges] = useState({ prev: false, next: true });

  const sync = useCallback(() => {
    if (api) setEdges({ prev: api.canScrollPrev(), next: api.canScrollNext() });
  }, [api]);

  useEffect(() => {
    if (!api) return;
    api.on("select", sync).on("reInit", sync).on("scroll", sync);
    return () => {
      api.off("select", sync).off("reInit", sync).off("scroll", sync);
    };
  }, [api, sync]);

  if (breeds.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" aria-roledescription="carrusel" className="border-t border-border py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="label-mono text-muted-foreground">Mismo país o mismo pelaje</p>
          <h2 id="related-heading" className="mt-2 text-3xl md:text-4xl">
            Razas emparentadas
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => api?.scrollPrev()} disabled={!edges.prev} aria-label="Anteriores">
            <ArrowLeft aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => api?.scrollNext()} disabled={!edges.next} aria-label="Siguientes">
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div ref={viewportRef} className="overflow-hidden">
        <ul className="-ml-4 flex touch-pan-y">
          {breeds.map((breed) => (
            <li
              key={breed.slug}
              aria-roledescription="diapositiva"
              className="min-w-0 shrink-0 grow-0 basis-[78%] pl-4 sm:basis-[45%] lg:basis-1/4"
            >
              <Link
                href={`/razas/${breed.slug}`}
                data-cue="breed"
                className="group corner-marks flex h-full min-h-40 flex-col justify-between p-5 text-foreground transition-colors hover:bg-muted/60"
              >
                <span className="label-mono text-primary">{breed.reason}</span>
                <span>
                  <span className="block font-serif text-2xl leading-tight">{breed.name}</span>
                  <span className="mt-1 block truncate text-sm text-muted-foreground">{breed.country ?? "Sin registrar"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
