import { cookies } from "next/headers";
import { HomeExperience } from "@presentation/home/home-experience";
import { loadInitialDirectory } from "@presentation/features/directory/load-initial-directory";
import { parseDirectoryParams } from "@presentation/lib/directory-params";
import { SIMULATION_COOKIE } from "@presentation/simulation/cookie";

interface HomeProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Home: SSR con datos en caché.
 *
 * Lee `?page=` para reconstruir en el servidor todas las páginas hasta la
 * que se compartió; cada página de la API sale de la caché de datos de Next
 * (revalida cada hora), así que el render no espera a la API. La lista de la
 * consola viaja ya en el HTML; la pantalla de inicio se salta si en esta
 * sesión ya se entró (cookie de sesión).
 */
export default async function HomePage({ searchParams }: HomeProps) {
  const [rawParams, cookieStore] = await Promise.all([searchParams, cookies()]);
  const params = parseDirectoryParams(rawParams);
  const { pages, error, renderedAt } = await loadInitialDirectory(params.page);

  return (
    <HomeExperience
      initialPages={pages}
      serverError={error}
      renderedAt={renderedAt}
      skipGate={cookieStore.get(SIMULATION_COOKIE)?.value === "1"}
    />
  );
}
