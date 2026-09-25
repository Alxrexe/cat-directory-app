"use client";

import { useDrag } from "@use-gesture/react";
import { ArrowDown, LoaderCircle } from "lucide-react";
import { animate, domAnimation, LazyMotion, m, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState, type RefObject } from "react";

const THRESHOLD = 72;
const MAX_PULL = 110;
const HOLD = 56;

interface PullGestureProps {
  onRefresh: () => Promise<unknown>;
  refreshing: boolean;
  target: RefObject<HTMLElement | null>;
  /** Solo se puede tirar con la lista arriba del todo. */
  isAtTop: () => boolean;
}

/**
 * Tirar para recargar (solo táctil, chunk propio). Con `pointer.touch` los
 * eventos siguen llegando mientras el navegador desplaza, sin bloquear el
 * scroll. El camino accesible es el botón Recargar.
 */
export default function PullGesture({ onRefresh, refreshing, target, isAtTop }: PullGestureProps) {
  const pull = useMotionValue(0);
  const [armed, setArmed] = useState(false);
  const rotate = useTransform(pull, [0, THRESHOLD], [0, 180]);
  const opacity = useTransform(pull, [0, 24, THRESHOLD], [0, 0.6, 1]);
  const y = useTransform(pull, (value) => value - 36);

  useEffect(() => {
    if (!refreshing) void animate(pull, 0, { duration: 0.3, ease: [0.16, 1, 0.3, 1] });
  }, [refreshing, pull]);

  useDrag(
    ({ first, active, movement: [, my], memo }) => {
      const eligible: boolean = first ? isAtTop() && !refreshing : Boolean(memo);
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
      target,
      axis: "y",
      // Sin `filterTaps`: su click en captura se tragaba los clics de ratón en
      // tabletas y las filas dejaban de abrirse.
      pointer: { touch: true },
      eventOptions: { passive: true },
    },
  );

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        aria-hidden="true"
        style={{ y, opacity }}
        className="pointer-events-none absolute top-0 left-1/2 z-10 -ml-5 flex size-10 items-center justify-center rounded-full bg-slate text-surface"
      >
        {refreshing ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <m.span style={{ rotate }} className={armed ? "scale-110" : undefined}>
            <ArrowDown className="size-4" />
          </m.span>
        )}
      </m.div>
    </LazyMotion>
  );
}
