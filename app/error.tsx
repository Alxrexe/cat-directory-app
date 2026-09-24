"use client";

import { RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@presentation/components/ui/button";

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
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center gap-6 px-4 py-24 md:px-8" role="alert">
      <p className="label-mono text-primary">Error inesperado</p>
      <h1 className="text-[clamp(2.5rem,7vw,5rem)] leading-[0.95]">Algo se rompió al pintar esta página.</h1>
      <p className="max-w-prose text-muted-foreground">
        No es un problema de tu conexión. Puedes intentarlo de nuevo o volver al directorio.
        {error.digest && <span className="label-mono mt-2 block text-faint">Ref. {error.digest}</span>}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>
          <RotateCw aria-hidden="true" /> Reintentar
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Ir al directorio</Link>
        </Button>
      </div>
    </div>
  );
}
