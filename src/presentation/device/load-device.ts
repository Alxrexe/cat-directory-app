import "server-only";
import { serverUseCases } from "@infrastructure/container/server";

/** Dossier y catálogo ("Al azar") desde la caché de datos: modal y página comparten el trabajo. */
export async function loadDevice(slug: string) {
  const [dossier, catalog] = await Promise.all([serverUseCases.getBreedDossier(slug), serverUseCases.loadCatalog()]);
  if (!dossier) return null;
  return { dossier, catalog: catalog.map((breed) => breed.slug) };
}
