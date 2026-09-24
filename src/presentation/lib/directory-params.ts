import { MAX_RESTORED_PAGES } from "@application/use-cases/restore-breed-pages";

/**
 * Estado del directorio que vive en la URL: `?q=` (búsqueda) y `?page=`
 * (página en pantalla). Lo leen igual el servidor, para el primer render, y
 * el cliente, así que el parseo es uno solo. La URL es entrada del usuario:
 * un valor inválido no rompe la página, cae al valor por defecto.
 */
export const SEARCH_MAX_LENGTH = 60;

export interface DirectoryParams {
  q: string;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);

function parseQuery(raw: unknown): string {
  const value = first(raw);
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX_LENGTH) : "";
}

function parsePage(raw: unknown): number {
  const value = first(raw);
  const page = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : Number.NaN;
  return Number.isInteger(page) && page >= 1 && page <= MAX_RESTORED_PAGES ? page : 1;
}

export function parseDirectoryParams(input: RawParams | URLSearchParams): DirectoryParams {
  const raw: RawParams = input instanceof URLSearchParams ? Object.fromEntries(input.entries()) : input;
  return { q: parseQuery(raw.q), page: parsePage(raw.page) };
}

/** Query string sin los valores por defecto: `/` es la home limpia. */
export function directorySearch({ q, page }: DirectoryParams): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `?${search}` : "";
}
