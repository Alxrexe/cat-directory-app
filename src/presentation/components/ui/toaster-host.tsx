"use client";

import { useEffect, useRef, useState } from "react";
import { useIdleModule } from "../../lib/idle";
import { loadToasterModule, registerToasterHost } from "../../lib/notify";

/** Monta el <Toaster> de sileo en ocioso, o antes si llega un aviso. */
export function ToasterHost() {
  const [requested, setRequested] = useState(false);
  const toaster = useIdleModule(loadToasterModule, { now: requested });
  const resolveMounted = useRef<() => void>(() => {});

  useEffect(() => {
    const mounted = new Promise<void>((resolve) => {
      resolveMounted.current = resolve;
    });
    registerToasterHost(() => setRequested(true), mounted);
  }, []);

  if (!toaster) return null;
  const Toaster = toaster.default;
  return <Toaster onMounted={() => resolveMounted.current()} />;
}
