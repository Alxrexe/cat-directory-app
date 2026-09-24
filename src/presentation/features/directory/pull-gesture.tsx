"use client";

import { useDrag } from "@use-gesture/react";
import { ArrowDown, LoaderCircle } from "lucide-react";
import { animate, domAnimation, LazyMotion, m, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";

const THRESHOLD = 72;
const MAX_PULL = 110;
const HOLD = 56;

interface PullGestureProps {
  onRefresh: () => Promise<unknown>;
  refreshing: boolean;
}

/**
 * Gesto e indicador de "tirar para recargar". Vive en su propio chunk
 * (use-gesture + motion) y solo se carga en pantallas táctiles, cuando el
 * navegador queda ocioso: ver pull-to-refresh.tsx.
 *
 * Con `pointer.touch` use-gesture escucha eventos táctiles, que siguen
 * llegando mientras el navegador desplaza, así que no hace falta bloquear
 * el scroll con `touch-action`. Solo arranca si el gesto empieza con la
 * página arriba del todo.
 *
 * Es un atajo visual: el botón "Recargar" de la barra hace lo mismo y es el
 * camino accesible, así que el indicador va oculto a lectores de pantalla.
 */
export default function PullGesture({ onRefresh, refreshing }: PullGestureProps) {
  const pull = useMotionValue(0);
  const [armed, setArmed] = useState(false);
  const rotate = useTransform(pull, [0, THRESHOLD], [0, 180]);
  const opacity = useTransform(pull, [0, 24, THRESHOLD], [0, 0.6, 1]);
  const y = useTransform(pull, (value) => value - 44);

  useEffect(() => {
    if (!refreshing) void animate(pull, 0, { duration: 0.3, ease: [0.16, 1, 0.3, 1] });
  }, [refreshing, pull]);

  useDrag(
    ({ first, active, movement: [, my], memo }) => {
      const eligible: boolean = first ? window.scrollY <= 0 && !refreshing : Boolean(memo);
      if (!eligible) return false;

      const distance = Math.min(MAX_PULL, Math.max(0, my) * 0.5);
      if (active) {
        pull.set(distance);
        setArmed(distance >= THRESHOLD);
        return true;
      }

      setArmed(false);
      if (distance >= THRESHOLD) {
        void animate(pull, HOLD, { duration: 0.2 });
        void onRefresh();
      } else {
        void animate(pull, 0, { duration: 0.25, ease: [0.16, 1, 0.3, 1] });
      }
      return false;
    },
    {
      target: typeof window === "undefined" ? undefined : window,
      axis: "y",
      filterTaps: true,
      pointer: { touch: true },
      eventOptions: { passive: true },
    },
  );

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        aria-hidden="true"
        style={{ y, opacity }}
        className="pointer-events-none fixed top-0 left-1/2 z-40 -ml-5 flex size-10 items-center justify-center border border-border bg-background text-foreground"
      >
        {refreshing ? (
          <LoaderCircle className="size-4 animate-spin text-primary" />
        ) : (
          <m.span style={{ rotate }} className={armed ? "text-primary" : undefined}>
            <ArrowDown className="size-4" />
          </m.span>
        )}
      </m.div>
    </LazyMotion>
  );
}
