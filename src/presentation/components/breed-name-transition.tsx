import * as React from "react";
import type { ReactNode } from "react";

/**
 * El nombre de una raza como elemento compartido entre la lista y el
 * detalle: al navegar, el navegador lo interpola de una posición a otra.
 *
 * `ViewTransition` solo existe en el React que trae el App Router; fuera de
 * él (tests, navegadores sin la API) se degrada a un fragmento y la
 * navegación sigue siendo instantánea, sin animación.
 */
const ViewTransition = (React as { ViewTransition?: React.ComponentType<React.ViewTransitionProps> }).ViewTransition;

export function BreedNameTransition({ slug, children }: { slug: string; children: ReactNode }) {
  if (!ViewTransition) return <>{children}</>;
  return (
    <ViewTransition name={`breed-${slug}`} share="breed-name" default="none">
      {children}
    </ViewTransition>
  );
}
