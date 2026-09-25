import { MAX_RESTORED_PAGES } from "@application/use-cases/restore-breed-pages";
import { COAT_FAMILIES, type CoatFamily } from "@domain/breed/coat";

/** `?q=`, `?page=` y `?pelaje=`, igual en servidor y cliente. Lo inválido cae al defecto. */
export const SEARCH_MAX_LENGTH = 60;

export type CoatFilter = CoatFamily | "all";

export interface DirectoryParams {
  q: string;
  page: number;
  coat: CoatFilter;
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

function parseCoat(raw: unknown): CoatFilter {
  const value = first(raw);
  return typeof value === "string" && (COAT_FAMILIES as readonly string[]).includes(value) ? (value as CoatFamily) : "all";
}

export function parseDirectoryParams(input: RawParams | URLSearchParams): DirectoryParams {
  const raw: RawParams = input instanceof URLSearchParams ? Object.fromEntries(input.entries()) : input;
  return { q: parseQuery(raw.q), page: parsePage(raw.page), coat: parseCoat(raw.pelaje) };
}

/** Query string sin los valores por defecto: `/` es la home limpia. */
export function directorySearch({ q, page, coat }: DirectoryParams): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (coat !== "all") params.set("pelaje", coat);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `?${search}` : "";
}
