"use client";

import { ArrowLeft, RotateCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import { Button } from "@presentation/components/ui/button";
import { ScreenMessage } from "@presentation/components/screen-message";

// `reset()` a secas repetiría el mismo render: hay que volver a pedir la ruta.
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
    <ScreenMessage
      role="alert"
      label="Sin respuesta de la API"
      title="El Ronrón no pudo encenderse"
      actions={
        <>
          <Button onClick={retry}>
            <RotateCw aria-hidden="true" /> Reintentar
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft aria-hidden="true" /> Michiverso
            </Link>
          </Button>
        </>
      }
    >
      catfact.ninja no respondió después de varios intentos. Suele ser pasajero: prueba de nuevo en unos segundos.
    </ScreenMessage>
  );
}
