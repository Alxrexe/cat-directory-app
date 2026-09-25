"use client";

import type { gsap as GsapInstance } from "gsap";
import { useEffect, useState } from "react";
import { loadOnce } from "./idle";

export type Gsap = typeof GsapInstance;

let instance: Gsap | null = null;
const listeners = new Set<(gsap: Gsap) => void>();

const importGsap = () =>
  import("gsap").then((module) => {
    const gsap = module.gsap ?? module.default;
    instance = gsap;
    for (const listener of listeners) listener(gsap);
    listeners.clear();
    return gsap;
  });

/**
 * GSAP vive en su propio chunk (~27 kB) y no se pide con la página: nada de
 * lo que se ve al cargar necesita animarse todavía. Llega con la primera
 * interacción (ver `loadGsapOnInteraction`) o cuando algo lo pide
 * explícitamente (el motor del campo, el botón de inicio). Hasta entonces lo
 * que hay en pantalla se queda quieto, nunca oculto.
 */
export const loadGsap = () => loadOnce(importGsap);

/**
 * GSAP si ya llegó, o `null` sin pedirlo. Para animaciones que se pueden
 * saltar sin perder nada (un rebote, un deslizamiento, una entrada).
 */
export function readyGsap(): Gsap | null {
  return instance;
}

/**
 * Pide GSAP con el primer gesto del visitante (mover el puntero, tocar,
 * teclear, girar la rueda): antes de eso no hay nada que animar, y así la
 * carga inicial no paga su evaluación. Devuelve la limpieza.
 */
export function loadGsapOnInteraction(): () => void {
  if (instance) return () => {};
  const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
  const load = () => {
    cleanup();
    void loadGsap().catch(() => {});
  };
  const cleanup = () => {
    for (const type of events) window.removeEventListener(type, load);
  };
  for (const type of events) window.addEventListener(type, load, { passive: true, once: true });
  return cleanup;
}

/**
 * GSAP como estado, para animaciones que deben empezar en cuanto llegue.
 * Con `eager`, se pide ya al montar; sin él, espera a la primera
 * interacción. `failed`: sin red, el componente se queda en su estado final
 * sin animar.
 */
export function useGsap({ eager = false }: { eager?: boolean } = {}): { gsap: Gsap | null; failed: boolean } {
  const [state, setState] = useState<{ gsap: Gsap | null; failed: boolean }>(() => ({ gsap: instance, failed: false }));

  useEffect(() => {
    if (state.gsap) return;
    let alive = true;
    const settle = () =>
      loadGsap().then(
        (gsap) => alive && setState({ gsap, failed: false }),
        () => alive && setState({ gsap: null, failed: true }),
      );
    if (eager) {
      void settle();
      return () => {
        alive = false;
      };
    }
    // Sin prisa: se entera cuando alguien (la primera interacción, el motor
    // del campo) lo haya descargado, sin pedirlo por su cuenta.
    const onReady = (gsap: Gsap) => alive && setState({ gsap, failed: false });
    listeners.add(onReady);
    const cleanup = loadGsapOnInteraction();
    return () => {
      alive = false;
      listeners.delete(onReady);
      cleanup();
    };
  }, [state.gsap, eager]);

  return state;
}
