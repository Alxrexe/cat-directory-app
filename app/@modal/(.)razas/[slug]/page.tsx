import { notFound } from "next/navigation";
import { DeviceModal } from "@presentation/device/device-modal";
import { loadDevice } from "@presentation/device/load-device";

interface InterceptedBreedProps {
  params: Promise<{ slug: string }>;
}

/**
 * Ruta interceptada: al abrir una raza desde el Michiverso (orbe o lista),
 * la URL cambia a /razas/[slug] pero la Home sigue debajo y el Ronrón se
 * abre como modal. Un F5 o un enlace directo cargan la página completa.
 */
export const revalidate = 3600;

export default async function InterceptedBreedPage({ params }: InterceptedBreedProps) {
  const { slug } = await params;
  const data = await loadDevice(slug);
  if (!data) notFound();
  return <DeviceModal dossier={data.dossier} catalog={data.catalog} />;
}
