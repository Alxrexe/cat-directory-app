import type { MetadataRoute } from "next";
import { serverUseCases } from "@infrastructure/container/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const revalidate = 3600;

/** La lista virtualizada solo pinta ~20 enlaces: el sitemap da a los buscadores todas las fichas. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const home: MetadataRoute.Sitemap = [{ url: SITE_URL, changeFrequency: "daily", priority: 1 }];
  try {
    const catalog = await serverUseCases.loadCatalog();
    return [
      ...home,
      ...catalog.map((breed) => ({
        url: `${SITE_URL}/razas/${breed.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return home;
  }
}
