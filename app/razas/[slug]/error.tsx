"use client";

import { ArrowLeft, RotateCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import { Button } from "@presentation/components/ui/button";

/**
 * La ficha no pudo generarse (la API falló y no había copia en caché).
 * "Reintentar" vuelve a pedir la ruta al servidor: `reset()` a secas solo
 * re-renderizaría el cliente con el mismo resultado.
 */
export default function BreedError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <div role="alert" className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center gap-6 px-4 py-24 md:px-8">
      <p className="label-mono text-primary">Sin respuesta de la API</p>
      <h1 className="text-[clamp(2.5rem,7vw,5rem)] leading-[0.95]">No pudimos abrir esta ficha.</h1>
      <p className="max-w-prose text-muted-foreground">
        catfact.ninja no respondió después de varios intentos. Suele ser pasajero: prueba de nuevo en unos segundos.
      </p>
      <div className="flex gap-3">
        <Button onClick={retry}>
          <RotateCw aria-hidden="true" /> Reintentar
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft aria-hidden="true" /> Directorio
          </Link>
        </Button>
      </div>
    </div>
  );
}
