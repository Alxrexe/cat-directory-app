"use client";

import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { BreedDossier } from "@application/use-cases/get-breed-dossier";
import { motionArmed } from "../lib/motion";
import { playCue } from "../lib/sound";
import { useSimulationStore } from "../simulation/simulation-store";
import { useDeviceStore } from "../stores/device-store";
import { useNavigationStore } from "../stores/navigation-store";
import { TopBar } from "../top-bar/top-bar";
import { playDeviceOpen, playDeviceSlide } from "./device-motion";
import { RonronDevice } from "./ronron-device";

/** La ficha a pantalla completa: enlace directo o recarga con el modal abierto. */
export function DevicePage({ dossier, catalog }: { dossier: BreedDossier; catalog: readonly string[] }) {
  const router = useRouter();
  const deviceRef = useRef<HTMLElement>(null);
  const directoryHref = useNavigationStore((state) => state.directoryHref);

  useEffect(() => {
    useSimulationStore.getState().activateSky();
  }, []);

  useLayoutEffect(() => {
    const device = deviceRef.current;
    // Abierta desde un enlace, la ficha llega pintada del servidor y se queda
    // quieta: las entradas son para cuando se llega navegando.
    if (!device || !motionArmed()) return;
    const { direction } = useDeviceStore.getState();
    const motion = direction !== 0 ? playDeviceSlide(device, direction) : playDeviceOpen(device, null);
    void motion.finished.then(() => useDeviceStore.getState().setDirection(0));
    return () => motion.finish();
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
