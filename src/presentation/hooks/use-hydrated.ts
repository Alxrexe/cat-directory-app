import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` en el servidor y durante la hidratación; `true` después. Permite
 * leer APIs del navegador (localStorage, navigator) sin que el primer render
 * del cliente difiera del HTML del servidor.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
