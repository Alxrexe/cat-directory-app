import { useEffect, useState } from "react";

/** `requestIdleCallback` con respaldo para Safari. Devuelve la cancelación. */
export function onIdle(callback: () => void, timeout = 2000): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(callback, 600);
  return () => window.clearTimeout(handle);
}

const cache = new Map<() => Promise<unknown>, Promise<unknown>>();

/**
 * Importa el módulo una sola vez, lo pidan cuantos componentes lo pidan.
 * Si la descarga falla (sin red), se olvida el intento para poder repetirlo:
 * una promesa rechazada en caché dejaría el módulo inservible para siempre.
 */
export function loadOnce<T>(loader: () => Promise<T>): Promise<T> {
  let pending = cache.get(loader);
  if (!pending) {
    pending = loader().catch((error: unknown) => {
      cache.delete(loader);
      throw error;
    });
    cache.set(loader, pending);
  }
  return pending as Promise<T>;
}

interface IdleModuleOptions {
  /** Hace falta ya (el usuario lo está usando): se pide sin esperar. */
  now?: boolean;
  /** Si además se precarga en ocioso. `false` para lo que quizá nunca se use. */
  idle?: boolean;
}

/**
 * Módulo que no hace falta para el primer pintado (menús, tooltips,
 * gráficos...). Devuelve `null` hasta que llega; el componente pinta
 * mientras tanto su versión básica, y si la descarga falla se queda en ella
 * (nunca lanza al render, a diferencia de `React.lazy`).
 */
export function useIdleModule<T>(loader: () => Promise<T>, { now = false, idle = true }: IdleModuleOptions = {}): T | null {
  const [module, setModule] = useState<T | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      void loadOnce(loader)
        .then((loaded) => alive && setModule(() => loaded))
        // Sin red: el componente sigue en su versión básica y lo reintenta al volver.
        .catch(() => window.addEventListener("online", load, { once: true }));
    if (now) load();
    const cancel = !now && idle ? onIdle(load) : () => {};
    return () => {
      alive = false;
      cancel();
      window.removeEventListener("online", load);
    };
  }, [loader, now, idle]);

  return module;
}

/**
 * `true` cuando la página ya cargó (evento load) y el navegador tuvo un
 * momento libre. Para lo que no debe competir con el primer pintado: el
 * video del cielo, el dato curioso. Si la página ya había cargado (se llegó
 * navegando), es cuestión de un frame.
 */
export function usePageSettled(): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    let cancel = () => {};
    const wait = () => {
      cancel = onIdle(() => setSettled(true), 1500);
    };
    if (document.readyState === "complete") wait();
    else window.addEventListener("load", wait, { once: true });
    return () => {
      cancel();
      window.removeEventListener("load", wait);
    };
  }, []);
  return settled;
}
