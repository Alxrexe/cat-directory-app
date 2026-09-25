import { HomeExperience } from "@presentation/home/home-experience";
import { loadInitialDirectory } from "@presentation/features/directory/load-initial-directory";
import { parseDirectoryParams } from "@presentation/lib/directory-params";

interface HomeProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Home: SSR con datos en caché.
 *
 * Lee `?page=` para reconstruir en el servidor todas las páginas hasta la
 * que se compartió; cada página de la API sale de la caché de datos de Next
 * (revalida cada hora), así que el render no espera a la API. La lista de la
 * consola viaja ya en el HTML. Cada vez que se entra al Michiverso (carga de
 * la página) se ve la pantalla de inicio con "Empezar simulación".
 */
export default async function HomePage({ searchParams }: HomeProps) {
  const rawParams = await searchParams;
  const params = parseDirectoryParams(rawParams);
  const { pages, error, renderedAt } = await loadInitialDirectory(params.page);

  return (
    <HomeExperience
      initialPages={pages}
      serverError={error}
      renderedAt={renderedAt}
    />
  );
}
