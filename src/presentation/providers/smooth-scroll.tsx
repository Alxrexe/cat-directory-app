"use client";

import { useEffect } from "react";
import type Lenis from "lenis";

const scrollable = () => document.documentElement.scrollHeight > window.innerHeight + 1;

/** Lenis solo con rueda y solo si la página se desplaza: su bucle fuerza layouts en cada frame. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;

    let lenis: Lenis | null = null;
    let loading = false;

    const sync = () => {
      if (!lenis) return;
      if (!scrollable()) {
        lenis.destroy();
        lenis = null;
      } else if (document.body.hasAttribute("data-scroll-locked")) lenis.stop();
      else lenis.start();
    };

    const onWheel = () => {
      if (lenis || loading || !scrollable()) return;
      loading = true;
      void import("lenis")
        .then(({ default: Lenis }) => {
          lenis = new Lenis({ autoRaf: true, lerp: 0.14, wheelMultiplier: 0.9 });
        })
        .catch(() => {}) // sin red: se queda el scroll nativo
        .finally(() => (loading = false));
    };

    const locks = new MutationObserver(sync);
    locks.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked"] });
    const size = new ResizeObserver(sync);
    size.observe(document.documentElement);
    window.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      locks.disconnect();
      size.disconnect();
      window.removeEventListener("wheel", onWheel);
      lenis?.destroy();
    };
  }, []);

  return null;
}
