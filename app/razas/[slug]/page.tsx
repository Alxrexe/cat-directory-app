import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { describeCountry } from "@domain/breed/country";
import { serverUseCases } from "@infrastructure/container/server";
import { DevicePage } from "@presentation/device/device-page";
import { loadDevice } from "@presentation/device/load-device";

interface BreedPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Ficha a pantalla completa: SSG con revalidación cada hora, la misma que
 * las páginas de la API. Todas las razas conocidas en el build se generan
 * como HTML estático; una raza nueva se genera en su primera visita
 * (`dynamicParams`). Si la API no responde en el build, no se genera
 * ninguna y todas pasan a generarse bajo demanda: el build nunca falla por
 * culpa de un tercero.
 *
 * Al navegar desde el Michiverso esta ruta no se usa: la intercepta
 * `@modal/(.)razas/[slug]` y el Ronrón se abre como modal sobre los orbes.
 */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const catalog = await serverUseCases.loadCatalog();
    // Los perfiles de Wikipedia se piden aquí, una vez y en serie, antes de
    // que los workers generen las 98 fichas en paralelo.
    await serverUseCases.warmProfiles();
    return catalog.map((breed) => ({ slug: breed.slug }));
  } catch (error) {
    console.warn("[detalle] sin catálogo en build, se generará bajo demanda:", error);
    return [];
  }
}

export async function generateMetadata({ params }: BreedPageProps): Promise<Metadata> {
  const { slug } = await params;
  const dossier = await serverUseCases.getBreedDossier(slug).catch(() => null);
  if (!dossier) return { title: "Raza no encontrada" };

  const { breed, profile } = dossier;
  const country = describeCountry(breed.country)?.primary;
  const description = `${breed.name}${country ? `, raza de ${country}` : ""}: origen, pelaje, patrón, foto y un dato curioso al azar en el Ronrón.`;
  return {
    title: breed.name,
    description,
    alternates: { canonical: `/razas/${breed.slug}` },
    openGraph: {
      title: `${breed.name} · Michiverso`,
      description,
      images: profile?.photo ? [{ url: profile.photo.url, width: profile.photo.width, height: profile.photo.height }] : undefined,
    },
  };
}

export default async function BreedPage({ params }: BreedPageProps) {
  const { slug } = await params;
  const data = await loadDevice(slug);
  if (!data) notFound();
  return <DevicePage dossier={data.dossier} catalog={data.catalog} />;
}
