"use client";

import { useEffect, useRef, useState } from "react";
import type { CoatFamily, CoatShare } from "@domain/breed/coat";
import { Skeleton } from "../../components/ui/skeleton";
import { COAT_LABEL } from "../../lib/format";
import { useIdleModule } from "../../lib/idle";

// recharts pesa: se descarga solo cuando la sección entra en pantalla.
const loadBars = () => import("./coat-bars");

interface CoatChartProps {
  shares: readonly CoatShare[];
  current: CoatFamily;
  total: number;
}

export function CoatChart({ shares, current, total }: CoatChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const bars = useIdleModule(loadBars, { now: inView, idle: false });
  const CoatBars = bars?.default;

  const own = shares.find((share) => share.family === current);
  const data = shares.map((share) => ({
    family: share.family,
    label: COAT_LABEL[share.family],
    count: share.count,
    current: share.family === current,
  }));

  return (
    <section aria-labelledby="coat-heading" className="border-t border-border py-10">
      <p className="label-mono text-muted-foreground">Contexto</p>
      <h2 id="coat-heading" className="mt-2 text-3xl md:text-4xl">
        Pelaje en el directorio
      </h2>
      <figure className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem] md:items-end">
        <div ref={ref} className="h-64" aria-hidden="true">
          {CoatBars ? <CoatBars data={data} /> : <Skeleton className="h-full w-full" />}
        </div>
        <figcaption className="text-sm leading-relaxed text-muted-foreground">
          {own ? (
            <>
              <span className="text-foreground">{COAT_LABEL[current]}</span>: {own.count} de {total} razas comparten
              esta familia de pelaje, incluida esta.
            </>
          ) : (
            <>La API no registra el pelaje de esta raza.</>
          )}
        </figcaption>
        <table className="sr-only">
          <caption>Razas por familia de pelaje</caption>
          <thead>
            <tr>
              <th scope="col">Pelaje</th>
              <th scope="col">Razas</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.family}>
                <th scope="row">
                  {row.label}
                  {row.current ? " (esta raza)" : ""}
                </th>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </section>
  );
}
