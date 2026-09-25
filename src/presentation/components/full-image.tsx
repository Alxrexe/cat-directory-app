"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { cn } from "../lib/cn";

interface FullImageProps {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  quality?: number;
  className?: string;
  onLoad?: () => void;
  /** Lo que se ve si la foto no llega (Wikimedia limita ráfagas con un 429). */
  fallback?: ReactNode;
}

/**
 * Una foto siempre completa y un contenedor siempre lleno.
 *
 * Las fotos de Wikimedia tienen proporciones muy distintas. Recortarlas
 * (`cover`) corta orejas y colas; encajarlas (`contain`) deja franjas. Aquí
 * la foto va entera, y detrás la misma foto ampliada y desenfocada rellena
 * el hueco con sus propios colores, como el fondo de una carátula.
 *
 * El fondo usa una miniatura de 16 px de la misma foto (menos de 1 KB): al
 * desenfocarla se ve igual que la grande, se decodifica al instante y, por
 * su baja densidad de datos, el navegador no la toma como el elemento de
 * mayor pintado (LCP), que sigue siendo la foto nítida.
 *
 * Si la foto falla, en lugar del icono de imagen rota se ve `fallback`.
 */
export function FullImage({ src, alt, sizes, priority = false, quality, className, onLoad, fallback }: FullImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === src) return <div className={cn("relative size-full", className)}>{fallback}</div>;
  return (
    <div className={cn("relative size-full overflow-hidden", className)}>
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        fill
        sizes="8px"
        quality={60}
        loading={priority ? "eager" : "lazy"}
        className="scale-125 object-cover opacity-80 blur-2xl saturate-125"
      />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        quality={quality}
        priority={priority}
        className="object-contain"
        data-photo
        onLoad={onLoad}
        onError={() => setFailedSrc(src)}
      />
    </div>
  );
}
