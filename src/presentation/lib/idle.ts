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

/** Una sola importación por módulo; si falla, se olvida para poder reintentar. */
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
  /** Pedirlo ya, sin esperar al ocio. */
  now?: boolean;
  /** Precargar en ocioso. `false` para lo que quizá nunca se use. */
  idle?: boolean;
}

/**
 * Como `React.lazy` pero sin lanzar: devuelve `null` hasta que llega el
 * módulo y el componente pinta su versión básica mientras tanto (o si falla).
 */
export function useIdleModule<T>(loader: () => Promise<T>, { now = false, idle = true }: IdleModuleOptions = {}): T | null {
  const [module, setModule] = useState<T | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      void loadOnce(loader)
        .then((loaded) => alive && setModule(() => loaded))
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

/** `true` tras el evento load y un momento de ocio: para lo que no debe competir con el LCP. */
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
