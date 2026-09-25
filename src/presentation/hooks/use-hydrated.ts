import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** `false` en el servidor y al hidratar: para leer APIs del navegador sin desajustes. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
