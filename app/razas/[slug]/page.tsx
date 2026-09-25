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
 * SSG + ISR cada hora. Si la API cae durante el build, las fichas se generan
 * bajo demanda. Desde el campo, esta ruta la intercepta el modal.
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
