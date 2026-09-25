"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { BreedDossier } from "@application/use-cases/get-breed-dossier";
import { readyGsap } from "../lib/gsap";
import { playCue } from "../lib/sound";
import { useSimulationStore } from "../simulation/simulation-store";
import { useDeviceStore } from "../stores/device-store";
import { playDeviceClose, playDeviceOpen } from "./device-motion";
import { RonronDevice } from "./ronron-device";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * El Ronrón como modal sobre el campo de orbes (ruta interceptada
 * `@modal/(.)razas/[slug]`): la URL es la de la ficha, así que se puede
 * compartir, y "atrás" lo cierra.
 *
 * Apertura: el aparato nace cerrado en el orbe (o fila) que se pulsó, viaja
 * al centro, la tapa se abre sobre la bisagra y las pantallas se encienden
 * (device-motion.ts). Cierre: el camino inverso, más corto.
 *
 * Al cambiar de raza desde dentro (◀ ▶, "Al azar", familia) no se repite la
 * apertura: solo el contenido se desliza en el sentido del cambio.
 */
export function DeviceModal({ dossier, catalog }: { dossier: BreedDossier; catalog: readonly string[] }) {
  const router = useRouter();
  const deviceRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  // El portal de Radix monta su contenido un render después que este
  // componente: la animación de apertura espera a que el Ronrón exista.
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

  // Apertura (o continuación, si venimos de otra raza del mismo Ronrón).
  useLayoutEffect(() => {
    const device = deviceRef.current;
    const overlay = overlayRef.current;
    if (!device || !overlay) return;
    const { direction } = useDeviceStore.getState();
    // GSAP ya está cargado (lo trajo el campo de orbes); si no, se abre sin animar.
    const gsap = readyGsap();

    if (!gsap || reduced()) {
      overlay.style.opacity = "1";
      return;
    }

    if (direction !== 0) {
      gsap.set(overlay, { opacity: 1 });
      const parts = device.querySelectorAll("[data-device-part]");
      const tl = gsap
        .timeline({ onComplete: () => useDeviceStore.getState().setDirection(0) })
        .fromTo(parts, { x: direction * 36, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, stagger: 0.05, ease: "power3.out" });
      return () => {
        tl.progress(1).kill();
      };
    }

    const tl = gsap.timeline();
    tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "sine.out" }, 0).add(
      playDeviceOpen(gsap, device, useSimulationStore.getState().origin),
      0,
    );
    return () => {
      // Interrumpida (otra raza, cierre): salta al estado final para que
      // ninguna pieza se quede a medio abrir.
      tl.progress(1).kill();
    };
  }, [dossier.breed.slug, mounted]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    playCue("release");
    const device = deviceRef.current;
    const overlay = overlayRef.current;
    const back = () => router.back();
    const gsap = readyGsap();
    if (!gsap || !device || !overlay || reduced()) {
      back();
      return;
    }
    gsap
      .timeline({ onComplete: back })
      .add(playDeviceClose(gsap, device, useSimulationStore.getState().origin), 0)
      .to(overlay, { opacity: 0, duration: 0.35, ease: "sine.in" }, 0.35);
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
            className="flex min-h-full items-center justify-center px-3 py-6 sm:px-6 [perspective:1400px]"
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
