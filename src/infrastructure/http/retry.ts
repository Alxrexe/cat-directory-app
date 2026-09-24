/**
 * Reintento con backoff exponencial y jitter.
 *
 * Sin jitter, cuando la API se cae, todos los clientes que fallaron a la vez
 * reintentan en el mismo milisegundo y la vuelven a tumbar. Con "equal
 * jitter" la mitad del retardo es fija (garantiza que esperamos) y la otra
 * mitad aleatoria (reparte a los clientes en el tiempo).
 */
export interface RetryPolicy {
  /** Reintentos después del primer intento. 3 ⇒ hasta 4 peticiones. */
  retries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  factor?: number;
}

export interface RetryNotice {
  /** Número de reintento que va a empezar (1-based). */
  attempt: number;
  retries: number;
  delayMs: number;
  error: unknown;
}

export interface RetryHooks {
  shouldRetry?: (error: unknown) => boolean;
  /** Retardo mínimo que pide el propio error (p. ej. `Retry-After`). */
  delayHint?: (error: unknown) => number | undefined;
  onRetry?: (notice: RetryNotice) => void;
  signal?: AbortSignal;
  random?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export function backoffDelay(attempt: number, policy: RetryPolicy, random: () => number = Math.random): number {
  const factor = policy.factor ?? 2;
  const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs * factor ** Math.max(0, attempt - 1));
  return Math.round(ceiling / 2 + random() * (ceiling / 2));
}

export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function withRetry<T>(
  task: (attempt: number) => Promise<T>,
  policy: RetryPolicy,
  hooks: RetryHooks = {},
): Promise<T> {
  const {
    shouldRetry = () => true,
    delayHint,
    onRetry,
    signal,
    random = Math.random,
    sleep = abortableSleep,
  } = hooks;

  for (let attempt = 0; ; attempt++) {
    try {
      return await task(attempt);
    } catch (error) {
      const exhausted = attempt >= policy.retries;
      if (exhausted || signal?.aborted || !shouldRetry(error)) throw error;

      // Si el servidor pide esperar más, se le hace caso, pero con techo:
      // un Retry-After de diez minutos no puede dejar la UI colgada.
      const hinted = Math.min(delayHint?.(error) ?? 0, policy.maxDelayMs * 2);
      const delayMs = Math.max(backoffDelay(attempt + 1, policy, random), hinted);

      onRetry?.({ attempt: attempt + 1, retries: policy.retries, delayMs, error });
      await sleep(delayMs, signal);
    }
  }
}
