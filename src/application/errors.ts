/**
 * Contrato de fallo de los puertos de datos.
 *
 * Cualquier adaptador (HTTP, caché, un mock en tests) rechaza con
 * `DataSourceError`, así que la UI decide qué mostrar mirando `kind` y no el
 * mensaje de `fetch` de turno, que cambia entre navegadores.
 */
export type DataSourceErrorKind =
  | "offline" //         el navegador no tiene red
  | "timeout" //         la API no respondió a tiempo
  | "network" //         la petición no llegó (DNS, CORS, conexión cortada)
  | "rate-limited" //    429
  | "server" //          5xx
  | "client" //          4xx distinto de 408/429
  | "invalid-response" // llegó algo que no cumple el esquema
  | "aborted"; //        la cancelamos nosotros

const RETRYABLE: ReadonlySet<DataSourceErrorKind> = new Set(["offline", "timeout", "network", "rate-limited", "server"]);

export interface DataSourceErrorOptions {
  status?: number;
  retryAfterMs?: number;
  cause?: unknown;
}

export class DataSourceError extends Error {
  readonly kind: DataSourceErrorKind;
  readonly status?: number;
  readonly retryAfterMs?: number;

  constructor(kind: DataSourceErrorKind, message: string, options: DataSourceErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "DataSourceError";
    this.kind = kind;
    this.status = options.status;
    this.retryAfterMs = options.retryAfterMs;
  }

  /** Fallos transitorios: tiene sentido volver a intentarlo. */
  get retryable(): boolean {
    return RETRYABLE.has(this.kind);
  }
}

export function isDataSourceError(error: unknown): error is DataSourceError {
  return error instanceof DataSourceError;
}

/** Forma serializable, para cruzar del servidor al cliente como prop. */
export interface SerializedDataSourceError {
  kind: DataSourceErrorKind;
  status?: number;
}

export function serializeError(error: unknown): SerializedDataSourceError {
  if (isDataSourceError(error)) return { kind: error.kind, status: error.status };
  return { kind: "network" };
}
