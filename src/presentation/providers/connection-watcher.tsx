"use client";

import { onlineManager } from "@tanstack/react-query";
import { useEffect } from "react";
import { useConnectionStore } from "../stores/connection-store";
import { playCue } from "../lib/sound";
import { notify } from "../lib/notify";

/** Si la red ya se había caído antes de hidratar, React Query no se entera solo. */
export function ConnectionWatcher() {
  const setOnline = useConnectionStore((state) => state.setOnline);

  useEffect(() => {
    const goOffline = () => {
      setOnline(false);
      playCue("error");
      notify.warning("Sin conexión", {
        description: "Lo que ya estaba cargado sigue disponible. Retomaremos la carga al volver la red.",
        duration: null,
      });
    };
    const goOnline = () => {
      setOnline(true);
      playCue("ready");
      notify.success("Conexión restablecida", { duration: 3000 });
    };

    if (!navigator.onLine) {
      onlineManager.setOnline(false);
      goOffline();
    }
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [setOnline]);

  return null;
}
