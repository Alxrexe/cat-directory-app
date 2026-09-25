"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { directorySearch, parseDirectoryParams, type CoatFilter, type DirectoryParams } from "../lib/directory-params";

/**
 * La URL es la fuente de verdad de `q` y `page`.
 *
 * Se escribe con `history.replaceState`, que el App Router sincroniza con
 * `useSearchParams` sin volver a pedir la página al servidor: escribir en el
 * buscador no dispara un render de servidor por tecla. `replace` y no `push`
 * porque cada letra no es un paso al que el botón "atrás" deba volver.
 */
export function useDirectoryUrlState() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const params = useMemo(() => parseDirectoryParams(searchParams), [searchParams]);

  const update = useCallback(
    (next: Partial<DirectoryParams>) => {
      const current = parseDirectoryParams(new URLSearchParams(window.location.search));
      const href = `${pathname}${directorySearch({ ...current, ...next })}`;
      if (href !== `${window.location.pathname}${window.location.search}`) {
        window.history.replaceState(null, "", href);
      }
    },
    [pathname],
  );

  const setQuery = useCallback((q: string) => update({ q }), [update]);
  const setPage = useCallback((page: number) => update({ page }), [update]);
  const setCoat = useCallback((coat: CoatFilter) => update({ coat }), [update]);

  return { params, setQuery, setPage, setCoat };
}
