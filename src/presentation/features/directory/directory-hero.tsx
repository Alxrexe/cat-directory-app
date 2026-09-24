import { HeroStats } from "./hero-stats";
import { Iris } from "./iris";

interface DirectoryHeroProps {
  total: number | null;
  lastPage: number | null;
  perPage: number | null;
}

export function DirectoryHero({ total, lastPage, perPage }: DirectoryHeroProps) {
  return (
    <section aria-labelledby="page-title" className="border-b border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-10 pb-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16 md:px-8 md:pt-16 md:pb-14">
        <div>
          <p className="label-mono flex items-center gap-3 text-primary">
            <span className="h-px w-10 bg-primary" aria-hidden="true" />
            Directorio de razas felinas
          </p>
          <h1 id="page-title" className="mt-5 text-[clamp(3rem,9vw,6.75rem)] leading-[0.88] tracking-[-0.02em]">
            Cada raza,
            <br />
            <em className="text-primary">una ficha.</em>
          </h1>
          <p className="mt-6 max-w-[34rem] text-[1.0625rem] leading-relaxed text-muted-foreground">
            País, origen, pelaje y patrón de {total ?? "todas las"} razas de gato, ordenadas como un archivo. Abre
            cualquiera para ver su ficha completa y un dato curioso al azar.
          </p>
          <HeroStats total={total} lastPage={lastPage} perPage={perPage} />
        </div>

        <figure className="corner-marks hidden w-[15rem] self-end p-5 text-foreground md:block lg:w-[17rem]">
          <Iris />
          <figcaption className="label-mono mt-4 flex justify-between text-muted-foreground">
            <span>Fig. 01</span>
            <span>Iris felino</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
