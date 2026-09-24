import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import type { CoatFamily } from "@domain/breed/coat";

/** 7 → "007". Los índices de archivo tienen ancho fijo. */
export function padIndex(value: number, width = 3): string {
  return String(value).padStart(width, "0");
}

export function timeAgo(epochMs: number): string {
  return formatDistanceToNowStrict(epochMs, { locale: es, addSuffix: true });
}

export const COAT_LABEL: Record<CoatFamily, string> = {
  short: "Corto",
  "semi-long": "Semilargo",
  long: "Largo",
  mixed: "Corto y largo",
  rex: "Rizado (rex)",
  hairless: "Sin pelo",
  unknown: "Sin registrar",
};

export const MISSING = "Sin registrar";
