"use client";

import { RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@presentation/components/ui/button";
import { ScreenMessage } from "@presentation/components/screen-message";

/**
 * Red de seguridad para errores que nadie previó. Los fallos de la API ya
 * se gestionan en cada vista; si se llega aquí es un fallo de programación,
 * y aun así el usuario tiene una salida.
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ScreenMessage
      role="alert"
      label="Error inesperado"
      title="Algo se enredó al pintar esta pantalla"
      actions={
        <>
          <Button onClick={reset}>
            <RotateCw aria-hidden="true" /> Reintentar
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Ir al Michiverso</Link>
          </Button>
        </>
      }
    >
      No es un problema de tu conexión. Puedes intentarlo de nuevo o volver al inicio.
      {error.digest && <span className="hud mt-2 block">Ref. {error.digest}</span>}
    </ScreenMessage>
  );
}
