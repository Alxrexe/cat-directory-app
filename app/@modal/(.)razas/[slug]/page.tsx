import { notFound } from "next/navigation";
import { DeviceModal } from "@presentation/device/device-modal";
import { loadDevice } from "@presentation/device/load-device";

interface InterceptedBreedProps {
  params: Promise<{ slug: string }>;
}

// Abierta desde el campo, la Home sigue debajo; F5 o un enlace cargan la página completa.
export const revalidate = 3600;

export default async function InterceptedBreedPage({ params }: InterceptedBreedProps) {
  const { slug } = await params;
  const data = await loadDevice(slug);
  if (!data) notFound();
  return <DeviceModal dossier={data.dossier} catalog={data.catalog} />;
}
