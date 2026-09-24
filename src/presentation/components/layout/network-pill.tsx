"use client";

import { LoaderCircle, WifiOff } from "lucide-react";
import { useConnectionStore } from "../../stores/connection-store";

/**
 * Estado de red en la cabecera. Solo aparece cuando hay algo que contar:
 * sin conexión, o esperando un reintento. Es una región `status`, así que
 * el lector de pantalla lo anuncia sin robar el foco. La entrada es una
 * animación CSS (opacidad + desplazamiento), sin JS de animación.
 */
export function NetworkPill() {
  const online = useConnectionStore((state) => state.online);
  const retry = useConnectionStore((state) => state.retry);

  const message = !online ? "Sin conexión" : retry ? `Reintentando ${retry.attempt}/${retry.retries}` : null;

  return (
    <div role="status" aria-live="polite" className="flex items-center">
      {message && (
        <span
          key={online ? "retry" : "offline"}
          className="label-mono flex items-center gap-1.5 border border-border px-2 py-1 text-accent-foreground animate-in fade-in-0 slide-in-from-top-1 duration-200"
        >
          {online ? (
            <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
          ) : (
            <WifiOff className="size-3" aria-hidden="true" />
          )}
          {message}
        </span>
      )}
    </div>
  );
}
