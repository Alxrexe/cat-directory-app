import { DirectoryHero } from "@presentation/features/directory/directory-hero";
import { DirectoryView } from "@presentation/features/directory/directory-view";
import { loadInitialDirectory } from "@presentation/features/directory/load-initial-directory";
import { parseDirectoryParams } from "@presentation/lib/directory-params";

interface HomeProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Home: SSR con datos en caché.
 *
 * Lee `?page=` para reconstruir en el servidor todas las páginas hasta la
 * que se compartió, así un enlace o un F5 muestran lo mismo desde el primer
 * byte. Cada página de la API sale de la caché de datos de Next (revalida
 * cada hora), de modo que el render dinámico no espera a la API.
 */
export default async function HomePage({ searchParams }: HomeProps) {
  const params = parseDirectoryParams(await searchParams);
  const { pages, error, renderedAt } = await loadInitialDirectory(params.page);
  const first = pages[0];

  return (
    <>
      <DirectoryHero total={first?.total ?? null} lastPage={first?.lastPage ?? null} perPage={first?.perPage ?? null} />
      <DirectoryView initialPages={pages} serverError={error} renderedAt={renderedAt} />
    </>
  );
}
