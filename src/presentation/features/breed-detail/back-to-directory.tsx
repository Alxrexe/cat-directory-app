"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useNavigationStore } from "../../stores/navigation-store";

/**
 * "Volver" regresa a la misma vista del directorio que se dejó, con su
 * búsqueda y su página; al llegar, el foco vuelve a la fila de esta raza.
 */
export function BackToDirectory({ slug }: { slug: string }) {
  const href = useNavigationStore((state) => state.directoryHref);
  const setLastVisited = useNavigationStore((state) => state.setLastVisited);

  useEffect(() => setLastVisited(slug), [slug, setLastVisited]);

  return (
    <Link
      href={href}
      className="label-mono group inline-flex items-center gap-2 py-2 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3.5 transition-transform duration-200 ease-out group-hover:-translate-x-0.5" aria-hidden="true" />
      Directorio
    </Link>
  );
}
