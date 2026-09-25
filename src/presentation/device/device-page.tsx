"use client";

import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { BreedDossier } from "@application/use-cases/get-breed-dossier";
import { readyGsap } from "../lib/gsap";
import { playCue } from "../lib/sound";
import { useSimulationStore } from "../simulation/simulation-store";
import { useDeviceStore } from "../stores/device-store";
import { useNavigationStore } from "../stores/navigation-store";
import { TopBar } from "../top-bar/top-bar";
import { RonronDevice } from "./ronron-device";

/**
 * El Ronrón a pantalla completa: lo que se ve al abrir un enlace compartido
 * a una ficha o al recargar con el modal abierto. El mismo dispositivo, sobre
 * el cielo, con "B" para volver al Michiverso.
 */
export function DevicePage({ dossier, catalog }: { dossier: BreedDossier; catalog: readonly string[] }) {
  const router = useRouter();
  const deviceRef = useRef<HTMLElement>(null);
  const directoryHref = useNavigationStore((state) => state.directoryHref);

  useEffect(() => {
    useSimulationStore.getState().activateSky();
  }, []);

  useLayoutEffect(() => {
    const device = deviceRef.current;
    // Abierta desde un enlace, la ficha llega ya pintada del servidor y GSAP
    // aún no está: se queda quieta (y visible). Las entradas animadas son
    // para cuando se llega navegando, con GSAP ya en memoria.
    const gsap = readyGsap();
    if (!gsap || !device || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { direction } = useDeviceStore.getState();
    const parts = device.querySelectorAll("[data-device-part]");
    const tl = gsap.timeline({ onComplete: () => useDeviceStore.getState().setDirection(0) });
    if (direction !== 0) {
      tl.fromTo(parts, { x: direction * 36, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, stagger: 0.05, ease: "power3.out" });
    } else {
      tl.fromTo(device, { y: 30, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.9, ease: "expo.out" })
        .fromTo(
          device.querySelectorAll("[data-device-ears] > div, [data-device-shoulder]"),
          { y: 36, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: "back.out(1.6)" },
          0.25,
        )
        .fromTo(parts, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.07, ease: "power3.out" }, 0.2);
    }
    return () => {
      tl.kill();
    };
  }, [dossier.breed.slug]);

  const close = useCallback(() => {
    playCue("release");
    router.push(directoryHref);
  }, [router, directoryHref]);

  const navigate = useCallback(
    (slug: string, direction: -1 | 1) => {
      useDeviceStore.getState().setDirection(direction);
      playCue("page");
      router.push(`/razas/${slug}`, { scroll: false });
    },
    [router],
  );

  return (
    <>
      {/* Dos <Suspense> sin nada que esperar: la hidratación va en dos tandas cortas. */}
      <Suspense fallback={null}>
        <TopBar total={dossier.total} />
      </Suspense>
      <div className="flex min-h-dvh items-center justify-center px-3 pt-20 pb-8 sm:px-6 sm:pt-24">
        <Suspense fallback={null}>
          <RonronDevice rootRef={deviceRef} dossier={dossier} catalog={catalog} mode="page" onClose={close} onNavigate={navigate} />
        </Suspense>
      </div>
    </>
  );
}
