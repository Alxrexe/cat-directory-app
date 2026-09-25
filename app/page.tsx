import { HomeExperience } from "@presentation/home/home-experience";
import { loadInitialDirectory } from "@presentation/features/directory/load-initial-directory";
import { parseDirectoryParams } from "@presentation/lib/directory-params";

interface HomeProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Reconstruye en el servidor las páginas hasta `?page=`, desde la caché de datos de Next.
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
