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
  /** Wikimedia responde 429 a las ráfagas. */
  fallback?: ReactNode;
}

/**
 * Foto entera (`contain`) sobre la misma foto desenfocada, que rellena el
 * hueco. El fondo es una miniatura de 16 px: menos de 1 KB.
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
