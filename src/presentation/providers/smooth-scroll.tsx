"use client";

import { useEffect } from "react";

/**
 * Desplazamiento suave con Lenis, solo con rueda de ratón (en táctil el
 * scroll nativo ya es mejor y el gesto de recargar lo necesita intacto).
 *
 * Se para mientras un diálogo de Radix tiene el scroll bloqueado
 * (`data-scroll-locked` en el body); si no, la rueda movería la página que
 * hay debajo del modal. Con `prefers-reduced-motion` no se instancia.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let disposed = false;
    let cleanup = () => {};

    void import("lenis").catch(() => null).then((module) => {
      if (!module) return; // sin red: se queda el scroll nativo
      const Lenis = module.default;
      if (disposed) return;
      const lenis = new Lenis({ autoRaf: true, lerp: 0.14, wheelMultiplier: 0.9 });

      const sync = () => (document.body.hasAttribute("data-scroll-locked") ? lenis.stop() : lenis.start());
      const observer = new MutationObserver(sync);
      observer.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked"] });

      cleanup = () => {
        observer.disconnect();
        lenis.destroy();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return null;
}
