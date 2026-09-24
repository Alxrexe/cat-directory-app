import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { coatFamily } from "@domain/breed/coat";
import { describeCountry } from "@domain/breed/country";
import { serverUseCases } from "@infrastructure/container/server";
import { BreedNameTransition } from "@presentation/components/breed-name-transition";
import { BackToDirectory } from "@presentation/features/breed-detail/back-to-directory";
import { BreedSheet } from "@presentation/features/breed-detail/breed-sheet";
import { CoatChart } from "@presentation/features/breed-detail/coat-chart";
import { RandomFact } from "@presentation/features/breed-detail/random-fact";
import { RelatedBreeds, type RelatedBreedCard } from "@presentation/features/breed-detail/related-breeds";
import { padIndex } from "@presentation/lib/format";

interface BreedPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Detalle: SSG con revalidación cada hora, la misma que las páginas de la
 * API. Todas las razas conocidas en el build se generan como HTML
 * estático; una raza nueva se genera la primera vez que alguien la visita
 * (`dynamicParams`). Si la API no responde durante el build, no se genera
 * ninguna y todas pasan a generarse bajo demanda: el build nunca falla por
 * culpa de un tercero.
 */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const catalog = await serverUseCases.loadCatalog();
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

  const { breed } = dossier;
  const country = describeCountry(breed.country)?.primary;
  return {
    title: breed.name,
    description: `${breed.name}${country ? `, raza de ${country}` : ""}: origen, pelaje, patrón y un dato curioso al azar.`,
    alternates: { canonical: `/razas/${breed.slug}` },
  };
}

export default async function BreedPage({ params }: BreedPageProps) {
  const { slug } = await params;
  const dossier = await serverUseCases.getBreedDossier(slug);
  if (!dossier) notFound();

  const { breed, position, total, previous, next } = dossier;
  const country = describeCountry(breed.country);
  const targetCountry = country?.primary.toLowerCase();

  const related: RelatedBreedCard[] = dossier.related.map((item) => {
    const itemCountry = describeCountry(item.country)?.primary ?? null;
    return {
      slug: item.slug,
      name: item.name,
      country: itemCountry,
      reason: itemCountry && itemCountry.toLowerCase() === targetCountry ? "Mismo país" : "Mismo pelaje",
    };
  });

  return (
    <article className="mx-auto w-full max-w-6xl px-4 md:px-8">
      <nav aria-label="Ruta" className="flex items-center justify-between border-b border-border py-3">
        <BackToDirectory slug={breed.slug} />
        <p className="label-mono text-faint">
          Ficha {padIndex(position)} / {padIndex(total)}
        </p>
      </nav>

      <header className="border-b border-border pt-10 pb-10 md:pt-16">
        <p className="label-mono flex items-center gap-3 text-primary">
          <span className="h-px w-10 bg-primary" aria-hidden="true" />
          Ficha de raza
        </p>
        <BreedNameTransition slug={breed.slug}>
          <h1 className="mt-5 text-[clamp(3rem,11vw,8.5rem)] leading-[0.86] tracking-[-0.02em] wrap-break-word">
            {breed.name}
          </h1>
        </BreedNameTransition>
        <p className="mt-5 text-lg text-muted-foreground">
          {country ? (
            <>
              {country.primary}
              {country.note && <span className="text-faint"> · {country.note}</span>}
            </>
          ) : (
            "País sin registrar"
          )}
        </p>
      </header>

      <div className="grid gap-10 py-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-14">
        <section aria-labelledby="sheet-heading">
          <h2 id="sheet-heading" className="label-mono mb-4 font-mono text-muted-foreground">
            Datos de la API
          </h2>
          <BreedSheet breed={breed} />
        </section>
        <RandomFact slug={breed.slug} />
      </div>

      <RelatedBreeds breeds={related} />
      <CoatChart shares={dossier.coats} current={coatFamily(breed.coat)} total={total} />

      <nav aria-label="Otras fichas" className="grid grid-cols-2 border-t border-border">
        {previous ? (
          <Link href={`/razas/${previous.slug}`} className="group flex flex-col gap-1 py-8 pr-4">
            <span className="label-mono text-muted-foreground">← Anterior</span>
            <span className="font-serif text-2xl group-hover:text-primary md:text-3xl">{previous.name}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/razas/${next.slug}`} className="group flex flex-col items-end gap-1 border-l border-border py-8 pl-4 text-right">
            <span className="label-mono text-muted-foreground">Siguiente →</span>
            <span className="font-serif text-2xl group-hover:text-primary md:text-3xl">{next.name}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}
