"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { directorySearch, parseDirectoryParams, type CoatFilter, type DirectoryParams } from "../lib/directory-params";

/**
 * `q` y `page` viven en la URL. Con `replaceState` el App Router se sincroniza
 * sin pedir la página al servidor, y cada tecla no es un paso del historial.
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
