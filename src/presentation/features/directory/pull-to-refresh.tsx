"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { useIdleModule } from "../../lib/idle";

const loadGesture = () => import("./pull-gesture");
const coarsePointer = () => window.matchMedia("(pointer: coarse)").matches;

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown>;
  refreshing: boolean;
  children: ReactNode;
}

/**
 * "Tirar para recargar" solo existe en pantallas táctiles, y nadie tira de
 * la lista en el primer segundo: el gesto se descarga cuando el navegador
 * queda ocioso, fuera del camino crítico de la carga. En escritorio no se
 * descarga nunca; ahí está el botón "Recargar" de la barra.
 */
export function PullToRefresh({ onRefresh, refreshing, children }: PullToRefreshProps) {
  const touch = useSyncExternalStore(() => () => {}, coarsePointer, () => false);
  return (
    <>
      {touch && <TouchGesture onRefresh={onRefresh} refreshing={refreshing} />}
      {children}
    </>
  );
}

function TouchGesture({ onRefresh, refreshing }: Omit<PullToRefreshProps, "children">) {
  const gesture = useIdleModule(loadGesture);
  if (!gesture) return null;
  const PullGesture = gesture.default;
  return <PullGesture onRefresh={onRefresh} refreshing={refreshing} />;
}
