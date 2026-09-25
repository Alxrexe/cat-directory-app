import "server-only";
import { serverUseCases } from "@infrastructure/container/server";

/**
 * Datos del Ronrón para una ruta (página completa o modal): el dossier de la
 * raza y los slugs del catálogo para "Al azar". Ambos salen de la caché de
 * datos, así que el modal y la página comparten el mismo trabajo.
 */
export async function loadDevice(slug: string) {
  const [dossier, catalog] = await Promise.all([serverUseCases.getBreedDossier(slug), serverUseCases.loadCatalog()]);
  if (!dossier) return null;
  return { dossier, catalog: catalog.map((breed) => breed.slug) };
}
