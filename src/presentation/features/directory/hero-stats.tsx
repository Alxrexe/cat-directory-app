"use client";

import { useEffect, useRef } from "react";
import { padIndex } from "../../lib/format";

interface HeroStatsProps {
  total: number | null;
  lastPage: number | null;
  perPage: number | null;
}

/**
 * Cifras del archivo. El servidor las pinta ya con su valor final (sin JS
 * se leen igual); en el cliente GSAP las recorre desde cero una sola vez.
 * GSAP se importa dentro del efecto: no entra en el JS inicial de la página.
 */
export function HeroStats({ total, lastPage, perPage }: HeroStatsProps) {
  const ref = useRef<HTMLDListElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tween: { kill: () => void } | undefined;
    let cancelled = false;
    void import("gsap").catch(() => null).then((module) => {
      if (cancelled || !module) return; // sin GSAP las cifras ya están en su valor final
      const { gsap } = module;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-count]"));
      const state = nodes.map(() => ({ value: 0 }));
      tween = gsap.to(state, {
        value: (index: number) => Number(nodes[index].dataset.count),
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.08,
        onUpdate: () => {
          nodes.forEach((node, index) => {
            node.textContent = padIndex(Math.round(state[index].value), Number(node.dataset.width ?? 3));
          });
        },
      });
    });
    return () => {
      cancelled = true;
      tween?.kill();
    };
  }, []);

  const stats = [
    { label: "Razas", value: total, width: 3 },
    { label: "Páginas", value: lastPage, width: 2 },
    { label: "Por página", value: perPage, width: 2 },
  ];

  return (
    <dl ref={ref} className="mt-10 grid max-w-md grid-cols-3 border-t border-border">
      {stats.map((stat) => (
        <div key={stat.label} className="border-r border-border pt-3 pr-3 last:border-r-0 [&:not(:first-child)]:pl-3">
          <dt className="label-mono text-muted-foreground">{stat.label}</dt>
          <dd
            className="mt-1 font-mono text-2xl tabular-nums"
            data-count={stat.value ?? undefined}
            data-width={stat.width}
          >
            {stat.value === null ? "—" : padIndex(stat.value, stat.width)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
