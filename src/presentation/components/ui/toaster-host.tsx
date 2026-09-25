"use client";

import { useEffect, useRef, useState } from "react";
import { useIdleModule } from "../../lib/idle";
import { loadToasterModule, registerToasterHost } from "../../lib/notify";

/** sileo arrastra motion (~45 kB): se monta con la primera interacción o el primer aviso. */
export function ToasterHost() {
  const [requested, setRequested] = useState(false);
  const toaster = useIdleModule(loadToasterModule, { now: requested, idle: false });
  const resolveMounted = useRef<() => void>(() => {});

  useEffect(() => {
    const mounted = new Promise<void>((resolve) => {
      resolveMounted.current = resolve;
    });
    const request = () => setRequested(true);
    registerToasterHost(request, mounted);
    // Primera interacción: el aviso de "sin conexión" tiene que poder
    // pintarse aunque la red caiga después, así que se descarga ya.
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    for (const type of events) window.addEventListener(type, request, { once: true, passive: true });
    return () => {
      for (const type of events) window.removeEventListener(type, request);
    };
  }, []);

  if (!toaster) return null;
  const Toaster = toaster.default;
  return <Toaster onMounted={() => resolveMounted.current()} />;
}
