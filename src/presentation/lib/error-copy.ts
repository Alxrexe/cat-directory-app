import {
  isDataSourceError,
  type DataSourceErrorKind,
  type SerializedDataSourceError,
} from "@application/errors";

export interface ErrorCopy {
  title: string;
  description: string;
}

/** Por tipo de fallo, diciendo siempre qué pasa con lo que ya había en pantalla. */
const COPY: Record<DataSourceErrorKind, (status?: number) => ErrorCopy> = {
  offline: () => ({
    title: "Sin conexión",
    description: "Tu dispositivo no tiene internet. Lo que ya estaba cargado sigue aquí.",
  }),
  timeout: () => ({
    title: "La API tarda demasiado",
    description: "catfact.ninja no respondió a tiempo. Suele ser momentáneo.",
  }),
  network: () => ({
    title: "No pudimos conectar",
    description: "La petición no llegó a catfact.ninja. Revisa la conexión e inténtalo de nuevo.",
  }),
  "rate-limited": () => ({
    title: "Demasiadas peticiones",
    description: "La API pidió bajar el ritmo. Espera unos segundos antes de reintentar.",
  }),
  server: (status) => ({
    title: "La API está fallando",
    description: `catfact.ninja respondió con un error${status ? ` ${status}` : ""}. No es cosa tuya.`,
  }),
  client: (status) => ({
    title: "Petición rechazada",
    description: `La API no aceptó la petición${status ? ` (${status})` : ""}.`,
  }),
  "invalid-response": () => ({
    title: "Respuesta inesperada",
    description: "La API devolvió datos con un formato que no reconocemos, así que no los mostramos.",
  }),
  aborted: () => ({
    title: "Petición cancelada",
    description: "La carga se interrumpió antes de terminar.",
  }),
};

export function describeError(error: unknown): ErrorCopy {
  if (isDataSourceError(error)) return COPY[error.kind](error.status);
  if (isSerialized(error)) return COPY[error.kind](error.status);
  return COPY.network();
}

function isSerialized(value: unknown): value is SerializedDataSourceError {
  if (typeof value !== "object" || value === null || !("kind" in value)) return false;
  const { kind } = value as { kind: unknown };
  return typeof kind === "string" && kind in COPY;
}
