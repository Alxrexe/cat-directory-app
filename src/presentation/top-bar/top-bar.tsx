"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { CatMark } from "../brand/cat-mark";
import { CommandPalette } from "../features/command-palette/command-palette";
import { cn } from "../lib/cn";
import { readyGsap } from "../lib/gsap";
import { useDeviceStore } from "../stores/device-store";
import { useDiscoveryStore } from "../stores/discovery-store";
import { ConsoleClock, DiscoveryMeter, NetworkIndicator } from "./status";
import { ThemeToggle } from "./theme-toggle";

/**
 * Barra de sistema, como la fila superior del menú de una consola:
 * a la izquierda el "perfil" (la marca del Michiverso), a la derecha una
 * cápsula de estado (hora, red, razas descubiertas) separada por filetes
 * de 1 px, y dos botones redondos: el tema (sol/luna) y la búsqueda.
 *
 * No es una franja: son piezas de perla sueltas sobre el cielo.
 */
export function TopBar({ visible: wanted = true, total }: { visible?: boolean; total: number }) {
  const ref = useRef<HTMLElement>(null);
  // Con el Ronrón abierto como modal, la barra se aparta: el dispositivo
  // (y sus orejas) necesitan todo el alto.
  const deviceOpen = useDeviceStore((state) => state.open);
  const visible = wanted && !deviceOpen;
  // Si la barra ya se ve al cargar (una ficha abierta desde un enlace), llega
  // pintada del servidor y no hay entrada que animar. Solo se anima cuando
  // cambia después (la pantalla de inicio la revela; el Ronrón la aparta).
  const [shownAtMount] = useState(visible);
  const firstRun = useRef(true);

  useEffect(() => {
    void useDiscoveryStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (firstRun.current) {
      firstRun.current = false;
      if (visible === shownAtMount) return;
    }
    const gsap = readyGsap();
    if (!gsap) {
      // Sin GSAP todavía (o sin red): mismo resultado, sin animar.
      for (const child of node.children) (child as HTMLElement).style.opacity = visible ? "1" : "0";
      return;
    }
    // Las piezas bajan a su sitio una tras otra, con un pequeño rebote,
    // como la barra del menú de una consola al encenderse.
    if (visible) {
      gsap.fromTo(
        node.children,
        { y: -28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: "back.out(1.6)" },
      );
    } else {
      gsap.to(node.children, { y: -24, opacity: 0, duration: 0.3, ease: "power2.in" });
    }
  }, [visible, shownAtMount]);

  return (
    <header
      ref={ref}
      inert={!visible}
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between gap-3 p-3 sm:p-5 [&>*]:pointer-events-auto"
    >
      <Link
        href="/"
        aria-label="Michiverso, inicio"
        className={cn(
          !shownAtMount && "opacity-0",
          "pearl select-frame flex h-14 items-center gap-3 rounded-full py-1.5 pr-5 pl-1.5 transition-transform duration-200 ease-[var(--ease-cozy)] hover:-translate-y-0.5 active:translate-y-px max-sm:h-12 max-sm:p-1.5",
        )}
      >
        <CatMark className="size-11 shrink-0 max-sm:size-9" />
        <span className="flex flex-col gap-1.5 max-sm:sr-only">
          <span className="font-display text-[1.12rem] leading-none tracking-[-0.01em] text-slate max-sm:text-base">
            <span className="font-extrabold">Michi</span>
            <span className="font-medium text-ink-soft">verso</span>
          </span>
          <span className="hud leading-none text-ink-soft max-sm:hidden">Simulación felina</span>
        </span>
      </Link>

      <div className={cn(!shownAtMount && "opacity-0", "flex items-center gap-2 sm:gap-3")}>
        <div className="pearl flex h-12 items-center rounded-full px-1.5 max-sm:h-11">
          <Suspense fallback={null}>
            <ConsoleClock className="hidden px-3.5 md:flex" />
          </Suspense>
          <Divider className="hidden md:block" />
          <Suspense fallback={null}>
            <NetworkIndicator className="px-3 max-sm:px-2.5" />
          </Suspense>
          <Divider />
          <Suspense fallback={null}>
            <DiscoveryMeter total={total} className="pr-3.5 pl-2.5 max-sm:pr-2.5 max-sm:pl-2" />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <ThemeToggle />
        </Suspense>
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>
      </div>
    </header>
  );
}

function Divider({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`h-6 w-px shrink-0 bg-hairline ${className}`} />;
}
