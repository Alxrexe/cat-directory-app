"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { BreedDossier } from "@application/use-cases/get-breed-dossier";
import { EASE, play, prefersReducedMotion } from "../lib/motion";
import { playCue } from "../lib/sound";
import { useSimulationStore } from "../simulation/simulation-store";
import { useDeviceStore } from "../stores/device-store";
import { playDeviceClose, playDeviceOpen, playDeviceSlide } from "./device-motion";
import { RonronDevice } from "./ronron-device";

/**
 * La ficha como modal sobre el campo (ruta interceptada): la URL se comparte
 * y "atrás" la cierra. Cambiar de raza dentro solo desliza el contenido.
 */
export function DeviceModal({ dossier, catalog }: { dossier: BreedDossier; catalog: readonly string[] }) {
  const router = useRouter();
  const deviceRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  // El portal de Radix monta su contenido un render después: se espera al nodo.
  const [mounted, setMounted] = useState(false);
  const attachDevice = useCallback((node: HTMLElement | null) => {
    deviceRef.current = node;
    setMounted(Boolean(node));
  }, []);
  const closing = useRef(false);

  useEffect(() => {
    useDeviceStore.getState().setOpen(true);
    return () => useDeviceStore.getState().setOpen(false);
  }, []);

  useLayoutEffect(() => {
    const device = deviceRef.current;
    const overlay = overlayRef.current;
    if (!device || !overlay) return;
    overlay.style.opacity = "1";
    if (prefersReducedMotion()) return;

    const { direction } = useDeviceStore.getState();
    if (direction !== 0) {
      const slide = playDeviceSlide(device, direction);
      void slide.finished.then(() => useDeviceStore.getState().setDirection(0));
      return () => slide.finish();
    }

    play(overlay, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: EASE.out, fill: "backwards" });
    const open = playDeviceOpen(device, useSimulationStore.getState().origin);
    // Interrumpida: salta al final, nada queda a medio abrir.
    return () => open.finish();
  }, [dossier.breed.slug, mounted]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    playCue("release");
    const device = deviceRef.current;
    const overlay = overlayRef.current;
    const back = () => router.back();
    if (!device || !overlay || prefersReducedMotion()) {
      back();
      return;
    }
    const exit = playDeviceClose(device, useSimulationStore.getState().origin);
    play(overlay, [{ opacity: 1 }, { opacity: 0 }], { duration: 350, delay: 350, easing: EASE.in, fill: "forwards" });
    void exit.finished.then(back);
  }, [router]);

  const navigate = useCallback(
    (slug: string, direction: -1 | 1) => {
      useDeviceStore.getState().setDirection(direction);
      playCue("page");
      router.replace(`/razas/${slug}`, { scroll: false });
    },
    [router],
  );

  return (
    <Dialog.Root open onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        <Dialog.Overlay
          ref={overlayRef}
          className="fixed inset-0 z-50 bg-overlay opacity-0"
        />
        <Dialog.Content
          aria-describedby="ronron-desc"
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            close();
          }}
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain outline-none"
          data-lenis-prevent
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <Dialog.Title className="sr-only">{dossier.breed.name}</Dialog.Title>
          <p id="ronron-desc" className="sr-only">
            Ficha de la raza en el Ronrón. Flechas izquierda y derecha: otra raza. A: otro dato curioso. B o Escape: cerrar.
          </p>
          <div
            className="flex min-h-full items-center justify-center px-3 py-6 sm:px-6"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <RonronDevice
              rootRef={attachDevice}
              dossier={dossier}
              catalog={catalog}
              mode="modal"
              onClose={close}
              onNavigate={navigate}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
