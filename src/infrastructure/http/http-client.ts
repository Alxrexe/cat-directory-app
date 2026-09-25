import * as z from "zod/mini";
import type * as core from "zod/v4/core";
import { DataSourceError, isDataSourceError } from "@application/errors";
import { withRetry, type RetryNotice, type RetryPolicy } from "./retry";

export interface HttpClientConfig {
  timeoutMs: number;
  retry: RetryPolicy;
  /** Opciones que se añaden a cada petición (en el servidor, `next.revalidate`). */
  requestInit?: RequestInit;
  fetchImpl?: typeof fetch;
  isOnline?: () => boolean;
  onRetry?: (notice: RetryNotice & { url: string }) => void;
}

export interface HttpClient {
  getJson<T>(url: URL, schema: core.$ZodType<T>, options?: { signal?: AbortSignal }): Promise<T>;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

function errorFromResponse(response: Response): DataSourceError {
  const { status } = response;
  if (status === 429) {
    return new DataSourceError("rate-limited", "Demasiadas peticiones a la API", {
      status,
      retryAfterMs: parseRetryAfter(response.headers.get("retry-after")),
    });
  }
  if (status === 408) return new DataSourceError("timeout", "La API agotó el tiempo de espera", { status });
  if (status >= 500) return new DataSourceError("server", `La API respondió ${status}`, { status });
  return new DataSourceError("client", `La API rechazó la petición (${status})`, { status });
}

/** Un intento es timeout + validación del esquema; los fallos transitorios se reintentan. */
export function createHttpClient(config: HttpClientConfig): HttpClient {
  const fetchImpl = config.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const isOnline = config.isOnline ?? (() => true);

  async function attempt<T>(url: URL, schema: core.$ZodType<T>, outer?: AbortSignal): Promise<T> {
    if (!isOnline()) throw new DataSourceError("offline", "El navegador no tiene conexión");

    const timeout = AbortSignal.timeout(config.timeoutMs);
    const signal = outer ? AbortSignal.any([outer, timeout]) : timeout;

    let response: Response;
    try {
      response = await fetchImpl(url, {
        ...config.requestInit,
        method: "GET",
        signal,
        headers: { Accept: "application/json", ...config.requestInit?.headers },
      });
    } catch (cause) {
      if (outer?.aborted) throw new DataSourceError("aborted", "Petición cancelada", { cause });
      if (timeout.aborted) {
        throw new DataSourceError("timeout", `Sin respuesta en ${config.timeoutMs} ms`, { cause });
      }
      if (!isOnline()) throw new DataSourceError("offline", "Se perdió la conexión", { cause });
      throw new DataSourceError("network", "No se pudo contactar con la API", { cause });
    }

    if (!response.ok) throw errorFromResponse(response);

    let body: unknown;
    try {
      body = await response.json();
    } catch (cause) {
      if (timeout.aborted) throw new DataSourceError("timeout", "La respuesta llegó incompleta", { cause });
      throw new DataSourceError("invalid-response", "La respuesta no es JSON", { status: response.status, cause });
    }

    const parsed = z.safeParse(schema, body);
    if (!parsed.success) {
      throw new DataSourceError("invalid-response", "La respuesta no tiene la forma esperada", {
        status: response.status,
        cause: parsed.error,
      });
    }
    return parsed.data;
  }

  return {
    getJson(url, schema, options) {
      return withRetry(() => attempt(url, schema, options?.signal), config.retry, {
        signal: options?.signal,
        shouldRetry: (error) => isDataSourceError(error) && error.retryable,
        delayHint: (error) => (isDataSourceError(error) ? error.retryAfterMs : undefined),
        onRetry: (notice) => config.onRetry?.({ ...notice, url: url.toString() }),
      });
    },
  };
}
