import { describe, expect, it, vi } from "vitest";
import { backoffDelay, withRetry, type RetryPolicy } from "./retry";

const policy: RetryPolicy = { retries: 3, baseDelayMs: 100, maxDelayMs: 1000 };
const noSleep = vi.fn(async () => {});

describe("backoffDelay", () => {
  it("crece exponencialmente y respeta el techo", () => {
    const max = () => 1; // jitter al máximo: el retardo es el techo del intento
    expect([1, 2, 3, 4, 5].map((attempt) => backoffDelay(attempt, policy, max))).toEqual([100, 200, 400, 800, 1000]);
  });

  it("nunca baja de la mitad del techo (equal jitter)", () => {
    expect(backoffDelay(3, policy, () => 0)).toBe(200);
  });
});

describe("withRetry", () => {
  it("reintenta fallos transitorios y devuelve el primer éxito", async () => {
    const task = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("red"))
      .mockRejectedValueOnce(new Error("red"))
      .mockResolvedValue("ok");
    const onRetry = vi.fn();

    await expect(withRetry(task, policy, { sleep: noSleep, random: () => 1, onRetry })).resolves.toBe("ok");
    expect(task).toHaveBeenCalledTimes(3);
    expect(onRetry.mock.calls.map(([notice]) => [notice.attempt, notice.delayMs])).toEqual([
      [1, 100],
      [2, 200],
    ]);
  });

  it("se rinde tras el límite de intentos y expone el último error", async () => {
    const task = vi.fn(async () => {
      throw new Error("caído");
    });
    await expect(withRetry(task, policy, { sleep: noSleep })).rejects.toThrow("caído");
    expect(task).toHaveBeenCalledTimes(policy.retries + 1);
  });

  it("no reintenta lo que no es transitorio", async () => {
    const task = vi.fn(async () => {
      throw new Error("400");
    });
    await expect(withRetry(task, policy, { sleep: noSleep, shouldRetry: () => false })).rejects.toThrow("400");
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("espera de verdad entre intentos (con temporizadores falsos)", async () => {
    vi.useFakeTimers();
    const task = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new Error("red")).mockResolvedValue("ok");
    const promise = withRetry(task, policy, { random: () => 1 });

    await vi.advanceTimersByTimeAsync(99);
    expect(task).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toBe("ok");
    expect(task).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("respeta Retry-After cuando pide esperar más que el backoff", async () => {
    const task = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new Error("429")).mockResolvedValue("ok");
    const onRetry = vi.fn();
    await withRetry(task, policy, { sleep: noSleep, random: () => 1, delayHint: () => 700, onRetry });
    expect(onRetry.mock.calls[0][0].delayMs).toBe(700);
  });
});
