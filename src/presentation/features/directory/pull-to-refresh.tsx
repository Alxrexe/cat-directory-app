"use client";

import { useSyncExternalStore, type RefObject } from "react";
import { useIdleModule } from "../../lib/idle";

const loadGesture = () => import("./pull-gesture");
const coarsePointer = () => window.matchMedia("(pointer: coarse)").matches;

interface PullToRefreshProps {
  /** La lista está a la vista: solo entonces tiene sentido el gesto. */
  enabled: boolean;
  onRefresh: () => Promise<unknown>;
  refreshing: boolean;
  target: RefObject<HTMLElement | null>;
  isAtTop: () => boolean;
}

/**
 * "Tirar para recargar" solo existe en pantallas táctiles y con la lista
 * desplegada: el gesto (use-gesture + motion, ~50 kB) se descarga la
 * primera vez que se abre la lista. En escritorio no se descarga nunca;
 * ahí está el botón "Recargar" de la consola.
 */
export function PullToRefresh({ enabled, ...props }: PullToRefreshProps) {
  const touch = useSyncExternalStore(() => () => {}, coarsePointer, () => false);
  return touch && enabled ? <TouchGesture {...props} /> : null;
}

function TouchGesture(props: Omit<PullToRefreshProps, "enabled">) {
  const gesture = useIdleModule(loadGesture, { now: true });
  if (!gesture) return null;
  const PullGesture = gesture.default;
  return <PullGesture {...props} />;
}
